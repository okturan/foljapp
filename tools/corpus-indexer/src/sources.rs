use std::collections::VecDeque;
use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, SyncSender};
use std::thread;

use bzip2::read::BzDecoder;
use flate2::read::GzDecoder;
use parquet::file::reader::{FileReader, SerializedFileReader};
use parquet::record::{Field, Row};
use quick_xml::events::{BytesStart, Event};
use quick_xml::Reader as XmlReader;
use serde_json::Value;
use tar::Archive as TarArchive;
use xz2::read::XzDecoder;
use zip::ZipArchive;
use zstd::stream::read::Decoder as ZstdDecoder;

pub type SourceResult<T> = anyhow::Result<T>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Candidate {
    pub resource_id: String,
    pub doc_id: String,
    pub title: Option<String>,
    pub url: Option<String>,
    pub domain: Option<String>,
    pub genre: Option<String>,
    pub quality: Option<String>,
    pub sentence: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    MacocuGenreJsonlGz,
    MacocuXmlZip,
    Cc100XzLines,
    HpltJsonlZstDir,
    LeipzigTarGzDir,
    Mc4JsonGzDir,
    ParquetDir,
    WikimediaXmlBz2Dir,
    SeeUniversityTxtLines,
    OpusMosesZipDir,
    TatoebaTarBz2Dir,
    UdConlluZip,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResourceSpec {
    pub id: String,
    pub title: String,
    pub resource_kind: String,
    pub source_url: Option<String>,
    pub local_path_text: String,
    pub local_path: PathBuf,
    pub format: Option<String>,
    pub license: Option<String>,
    pub kind: SourceKind,
}

pub type CandidateStream = Box<dyn Iterator<Item = SourceResult<Candidate>> + Send>;

pub fn load_downloaded_resources(repo_root: impl AsRef<Path>) -> SourceResult<Vec<ResourceSpec>> {
    let repo_root = repo_root.as_ref();
    let resources_path = repo_root.join("data/corpora/resources.json");
    let resources_json = fs::read_to_string(&resources_path)?;
    let root: Value = serde_json::from_str(&resources_json)?;
    let resources = root
        .get("resources")
        .and_then(Value::as_array)
        .ok_or_else(|| invalid_data("resources.json is missing a resources array"))?;

    let mut specs = Vec::new();
    for resource in resources {
        if str_field(resource, "status") != Some("downloaded") {
            continue;
        }

        let Some(id) = str_field(resource, "id") else {
            continue;
        };
        let Some(local_path) = str_field(resource, "localPath") else {
            continue;
        };
        let format = str_field(resource, "format").map(ToOwned::to_owned);
        let Some(kind) = source_kind(id, format.as_deref()) else {
            continue;
        };

        specs.push(ResourceSpec {
            id: id.to_owned(),
            title: str_field(resource, "title").unwrap_or(id).to_owned(),
            resource_kind: str_field(resource, "kind").unwrap_or("").to_owned(),
            source_url: str_field(resource, "sourceUrl").map(ToOwned::to_owned),
            local_path_text: local_path.to_owned(),
            local_path: repo_root.join(local_path),
            format,
            license: str_field(resource, "license").map(ToOwned::to_owned),
            kind,
        });
    }

    Ok(specs)
}

pub fn open_resource(resource: &ResourceSpec) -> SourceResult<CandidateStream> {
    match resource.kind {
        SourceKind::MacocuGenreJsonlGz => {
            macocu_genre_jsonl_gz_with_id(resource.local_path.clone(), resource.id.clone())
        }
        SourceKind::MacocuXmlZip => Ok(macocu_xml_zip_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::Cc100XzLines => {
            cc100_xz_lines_with_id(resource.local_path.clone(), resource.id.clone())
        }
        SourceKind::HpltJsonlZstDir => Ok(hplt_jsonl_zst_dir_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::LeipzigTarGzDir => Ok(leipzig_tar_gz_dir_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::Mc4JsonGzDir => Ok(mc4_json_gz_dir_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::ParquetDir => Ok(parquet_dir_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::WikimediaXmlBz2Dir => Ok(wikimedia_xml_bz2_dir_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::SeeUniversityTxtLines => {
            seeuniversity_txt_lines_with_id(resource.local_path.clone(), resource.id.clone())
        }
        SourceKind::OpusMosesZipDir => Ok(opus_moses_zip_dir_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::TatoebaTarBz2Dir => Ok(tatoeba_tar_bz2_dir_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
        SourceKind::UdConlluZip => Ok(ud_conllu_zip_with_id(
            resource.local_path.clone(),
            resource.id.clone(),
        )),
    }
}

pub fn expand_resource_partitions(resource: &ResourceSpec) -> SourceResult<Vec<ResourceSpec>> {
    let paths = match resource.kind {
        SourceKind::HpltJsonlZstDir => files_with_suffix(&resource.local_path, ".jsonl.zst")?,
        SourceKind::LeipzigTarGzDir => files_with_suffix(&resource.local_path, ".tar.gz")?,
        SourceKind::Mc4JsonGzDir => files_with_suffix(&resource.local_path, ".json.gz")?,
        SourceKind::ParquetDir => files_with_suffix(&resource.local_path, ".parquet")?,
        SourceKind::WikimediaXmlBz2Dir => files_with_suffix(&resource.local_path, ".xml.bz2")?,
        SourceKind::OpusMosesZipDir => {
            files_with_suffix(&resource.local_path.join("zips"), ".zip")?
        }
        _ => Vec::new(),
    };

    if paths.len() <= 1 {
        return Ok(vec![resource.clone()]);
    }

    paths
        .into_iter()
        .map(|path| {
            let shard = partition_name(&resource.local_path, &path);
            let mut partition = resource.clone();
            partition.id = format!("{}#{}", resource.id, shard);
            partition.title = format!("{} ({})", resource.title, shard);
            partition.local_path_text = path.to_string_lossy().into_owned();
            partition.local_path = path;
            Ok(partition)
        })
        .collect()
}

fn macocu_genre_jsonl_gz_with_id(
    path: PathBuf,
    resource_id: String,
) -> SourceResult<CandidateStream> {
    let file = File::open(path)?;
    let decoder = GzDecoder::new(file);
    Ok(Box::new(MacocuGenreJsonlIter {
        resource_id,
        lines: BufReader::new(decoder).lines(),
        pending: VecDeque::new(),
    }))
}

fn cc100_xz_lines_with_id(path: PathBuf, resource_id: String) -> SourceResult<CandidateStream> {
    let file = File::open(path)?;
    let decoder = XzDecoder::new(file);
    Ok(Box::new(LineCandidateIter::new(
        resource_id,
        BufReader::new(decoder),
        None,
        None,
        None,
        None,
        None,
    )))
}

fn seeuniversity_txt_lines_with_id(
    path: PathBuf,
    resource_id: String,
) -> SourceResult<CandidateStream> {
    let file = File::open(path)?;
    Ok(Box::new(LineCandidateIter::new(
        resource_id,
        BufReader::new(file),
        Some("https://huggingface.co/datasets/SEEUniversity/albanian_corpora_bert".to_owned()),
        Some("huggingface.co".to_owned()),
        None,
        None,
        None,
    )))
}

fn macocu_xml_zip_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_macocu_xml_zip(path, resource_id, tx))
}

fn hplt_jsonl_zst_dir_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_hplt_jsonl_zst_dir(path, resource_id, tx))
}

fn leipzig_tar_gz_dir_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_leipzig_tar_gz_dir(path, resource_id, tx))
}

fn mc4_json_gz_dir_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_mc4_json_gz_dir(path, resource_id, tx))
}

fn parquet_dir_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_parquet_dir(path, resource_id, tx))
}

fn wikimedia_xml_bz2_dir_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_wikimedia_xml_bz2_dir(path, resource_id, tx))
}

fn opus_moses_zip_dir_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_opus_moses_zip_dir(path, resource_id, tx))
}

fn tatoeba_tar_bz2_dir_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_tatoeba_tar_bz2_dir(path, resource_id, tx))
}

fn ud_conllu_zip_with_id(path: PathBuf, resource_id: String) -> CandidateStream {
    spawn_reader(move |tx| run_ud_conllu_zip(path, resource_id, tx))
}

struct MacocuGenreJsonlIter<R>
where
    R: BufRead,
{
    resource_id: String,
    lines: io::Lines<R>,
    pending: VecDeque<Candidate>,
}

impl<R> Iterator for MacocuGenreJsonlIter<R>
where
    R: BufRead,
{
    type Item = SourceResult<Candidate>;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            if let Some(candidate) = self.pending.pop_front() {
                return Some(Ok(candidate));
            }

            let line = match self.lines.next()? {
                Ok(line) => line,
                Err(err) => return Some(Err(err.into())),
            };
            if line.trim().is_empty() {
                continue;
            }

            let record: Value = match serde_json::from_str(&line) {
                Ok(record) => record,
                Err(err) => return Some(Err(err.into())),
            };

            let Some(text) = str_field(&record, "text") else {
                continue;
            };
            let doc_id = str_field(&record, "id").unwrap_or("unknown-doc");
            let title = str_field(&record, "title").map(ToOwned::to_owned);
            let url = str_field(&record, "url").map(ToOwned::to_owned);
            let domain = str_field(&record, "domain").map(ToOwned::to_owned);
            let genre = str_field(&record, "genre").map(ToOwned::to_owned);

            for (idx, sentence) in split_sentences(text).into_iter().enumerate() {
                self.pending.push_back(Candidate {
                    resource_id: self.resource_id.clone(),
                    doc_id: format!("{doc_id}#s{}", idx + 1),
                    title: title.clone(),
                    url: url.clone(),
                    domain: domain.clone(),
                    genre: genre.clone(),
                    quality: Some("good".to_owned()),
                    sentence,
                });
            }
        }
    }
}

struct LineCandidateIter<R>
where
    R: BufRead,
{
    resource_id: String,
    lines: io::Lines<R>,
    line_number: usize,
    pending: VecDeque<Candidate>,
    title: Option<String>,
    url: Option<String>,
    domain: Option<String>,
    genre: Option<String>,
    quality: Option<String>,
}

impl<R> LineCandidateIter<R>
where
    R: BufRead,
{
    fn new(
        resource_id: String,
        reader: R,
        url: Option<String>,
        domain: Option<String>,
        title: Option<String>,
        genre: Option<String>,
        quality: Option<String>,
    ) -> Self {
        Self {
            resource_id,
            lines: reader.lines(),
            line_number: 0,
            pending: VecDeque::new(),
            title,
            url,
            domain,
            genre,
            quality,
        }
    }
}

impl<R> Iterator for LineCandidateIter<R>
where
    R: BufRead,
{
    type Item = SourceResult<Candidate>;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            if let Some(candidate) = self.pending.pop_front() {
                return Some(Ok(candidate));
            }

            let line = match self.lines.next()? {
                Ok(line) => line,
                Err(err) => return Some(Err(err.into())),
            };
            self.line_number += 1;

            let sentences = split_sentences(&line);
            if sentences.is_empty() {
                continue;
            }
            for (idx, sentence) in sentences.into_iter().enumerate() {
                self.pending.push_back(Candidate {
                    resource_id: self.resource_id.clone(),
                    doc_id: format!("{}:{}#s{}", self.resource_id, self.line_number, idx + 1),
                    title: self.title.clone(),
                    url: self.url.clone(),
                    domain: self.domain.clone(),
                    genre: self.genre.clone(),
                    quality: self.quality.clone(),
                    sentence,
                });
            }
        }
    }
}

struct ReceiverCandidateIter {
    rx: mpsc::Receiver<SourceResult<Candidate>>,
}

impl Iterator for ReceiverCandidateIter {
    type Item = SourceResult<Candidate>;

    fn next(&mut self) -> Option<Self::Item> {
        self.rx.recv().ok()
    }
}

fn spawn_reader<F>(read: F) -> CandidateStream
where
    F: FnOnce(SyncSender<SourceResult<Candidate>>) -> SourceResult<()> + Send + 'static,
{
    let (tx, rx) = mpsc::sync_channel(256);
    thread::spawn({
        let tx = tx.clone();
        move || {
            if let Err(err) = read(tx.clone()) {
                let _ = tx.send(Err(err));
            }
        }
    });

    Box::new(ReceiverCandidateIter { rx })
}

fn run_macocu_xml_zip(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let file = File::open(path)?;
    let mut archive = ZipArchive::new(file)?;
    let xml_name = first_zip_member_name(&mut archive, |name| name.ends_with(".xml"))?
        .ok_or_else(|| invalid_data("MaCoCu XML zip does not contain an .xml member"))?;
    let member = archive.by_name(&xml_name)?;
    let mut reader = XmlReader::from_reader(BufReader::new(member));
    let mut buf = Vec::new();
    let mut doc = DocMeta::default();
    let mut para = ParaMeta::default();
    let mut in_para = false;
    let mut para_text = String::new();

    loop {
        match reader.read_event_into(&mut buf)? {
            Event::Start(event) if event.name().as_ref() == b"doc" => {
                doc = DocMeta {
                    id: attr_value(&event, b"id"),
                    title: attr_value(&event, b"title"),
                    url: attr_value(&event, b"url"),
                    domain: attr_value(&event, b"domain"),
                };
            }
            Event::Start(event) if event.name().as_ref() == b"p" => {
                para = ParaMeta {
                    id: attr_value(&event, b"id"),
                    quality: attr_value(&event, b"quality"),
                };
                para_text.clear();
                in_para = true;
            }
            Event::Text(event) if in_para => {
                para_text.push_str(&decode_xml_bytes(&reader, event.as_ref())?);
            }
            Event::CData(event) if in_para => {
                para_text.push_str(&decode_xml_bytes(&reader, event.as_ref())?);
            }
            Event::End(event) if event.name().as_ref() == b"p" => {
                let doc_id = para
                    .id
                    .clone()
                    .or_else(|| doc.id.clone())
                    .unwrap_or_else(|| "unknown-paragraph".to_owned());
                for (idx, sentence) in split_sentences(&para_text).into_iter().enumerate() {
                    let candidate = Candidate {
                        resource_id: resource_id.clone(),
                        doc_id: format!("{doc_id}#s{}", idx + 1),
                        title: doc.title.clone(),
                        url: doc.url.clone(),
                        domain: doc.domain.clone(),
                        genre: None,
                        quality: para.quality.clone(),
                        sentence,
                    };
                    if tx.send(Ok(candidate)).is_err() {
                        return Ok(());
                    }
                }
                para_text.clear();
                in_para = false;
            }
            Event::End(event) if event.name().as_ref() == b"doc" => {
                doc = DocMeta::default();
            }
            Event::Eof => return Ok(()),
            _ => {}
        }
        buf.clear();
    }
}

fn run_opus_moses_zip_dir(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let mut zip_paths = if path.is_file() {
        vec![path]
    } else {
        fs::read_dir(path.join("zips"))?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| path.extension().and_then(|extension| extension.to_str()) == Some("zip"))
            .collect::<Vec<_>>()
    };
    zip_paths.sort();

    for zip_path in zip_paths {
        let title = zip_path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .map(ToOwned::to_owned);
        let file = File::open(&zip_path)?;
        let mut archive = ZipArchive::new(file)?;
        let sq_member_names = zip_member_names(&mut archive, |name| name.ends_with(".sq"))?;

        for member_name in sq_member_names {
            let member = archive.by_name(&member_name)?;
            let reader = BufReader::new(member);
            for (idx, line) in reader.lines().enumerate() {
                for (sentence_idx, sentence) in split_sentences(&line?).into_iter().enumerate() {
                    let candidate = Candidate {
                        resource_id: resource_id.clone(),
                        doc_id: format!("{}:{}#s{}", member_name, idx + 1, sentence_idx + 1),
                        title: title.clone(),
                        url: None,
                        domain: Some("opus.nlpl.eu".to_owned()),
                        genre: Some("parallel".to_owned()),
                        quality: None,
                        sentence,
                    };
                    if tx.send(Ok(candidate)).is_err() {
                        return Ok(());
                    }
                }
            }
        }
    }

    Ok(())
}

fn run_hplt_jsonl_zst_dir(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let mut shard_paths = if path.is_file() {
        vec![path.clone()]
    } else {
        fs::read_dir(&path)?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.ends_with(".jsonl.zst"))
            })
            .collect::<Vec<_>>()
    };
    shard_paths.sort();

    for shard_path in shard_paths {
        let shard_name = shard_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("hplt-shard")
            .to_owned();
        let file = File::open(&shard_path)?;
        let decoder = ZstdDecoder::new(file)?;
        let reader = BufReader::new(decoder);

        for (line_idx, line) in reader.lines().enumerate() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            let record: Value = serde_json::from_str(&line)?;
            let Some(text) = str_field(&record, "text") else {
                continue;
            };
            let url = str_field(&record, "u").map(ToOwned::to_owned);
            let domain = url.as_deref().and_then(domain_from_url);
            let doc_id = str_field(&record, "id")
                .map(ToOwned::to_owned)
                .unwrap_or_else(|| format!("{shard_name}:{}", line_idx + 1));
            let quality = match str_field(&record, "filter") {
                Some("keep") => Some("good".to_owned()),
                Some(value) => Some(value.to_owned()),
                None => None,
            };

            for (sentence_idx, sentence) in split_sentences(text).into_iter().enumerate() {
                let candidate = Candidate {
                    resource_id: resource_id.clone(),
                    doc_id: format!("{doc_id}#s{}", sentence_idx + 1),
                    title: str_field(&record, "crawl_id").map(ToOwned::to_owned),
                    url: url.clone(),
                    domain: domain.clone(),
                    genre: Some("web".to_owned()),
                    quality: quality.clone(),
                    sentence,
                };
                if tx.send(Ok(candidate)).is_err() {
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

fn run_leipzig_tar_gz_dir(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let mut archive_paths = if path.is_file() {
        vec![path.clone()]
    } else {
        fs::read_dir(&path)?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.ends_with(".tar.gz"))
            })
            .collect::<Vec<_>>()
    };
    archive_paths.sort();

    for archive_path in archive_paths {
        let archive_name = archive_path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("leipzig")
            .trim_end_matches(".tar")
            .to_owned();
        let file = File::open(&archive_path)?;
        let decoder = GzDecoder::new(file);
        let mut archive = TarArchive::new(decoder);

        for entry in archive.entries()? {
            let entry = entry?;
            let member_name = entry.path()?.to_string_lossy().into_owned();
            if !member_name.ends_with("-sentences.txt") {
                continue;
            }

            let reader = BufReader::new(entry);
            for (idx, line) in reader.lines().enumerate() {
                let line = line?;
                let Some((raw_id, text)) = line.split_once('\t') else {
                    continue;
                };
                for (sentence_idx, sentence) in split_sentences(text).into_iter().enumerate() {
                    let candidate = Candidate {
                        resource_id: resource_id.clone(),
                        doc_id: format!("{archive_name}:{raw_id}#s{}", sentence_idx + 1),
                        title: Some(archive_name.clone()),
                        url: None,
                        domain: Some("wortschatz-leipzig.de".to_owned()),
                        genre: Some("leipzig".to_owned()),
                        quality: Some("good".to_owned()),
                        sentence,
                    };
                    if tx.send(Ok(candidate)).is_err() {
                        return Ok(());
                    }
                }
                if idx > 0 && idx.is_multiple_of(1_000_000) {
                    println!("  read {idx} Leipzig sentence lines from {archive_name}");
                }
            }
        }
    }

    Ok(())
}

fn run_mc4_json_gz_dir(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let mut shard_paths = if path.is_file() {
        vec![path.clone()]
    } else {
        fs::read_dir(&path)?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.ends_with(".json.gz"))
            })
            .collect::<Vec<_>>()
    };
    shard_paths.sort();

    for shard_path in shard_paths {
        let shard_name = shard_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("mc4-shard")
            .to_owned();
        let file = File::open(&shard_path)?;
        let decoder = GzDecoder::new(file);
        let reader = BufReader::new(decoder);

        for (line_idx, line) in reader.lines().enumerate() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            let record: Value = serde_json::from_str(&line)?;
            let Some(text) = str_field(&record, "text") else {
                continue;
            };
            let url = str_field(&record, "url").map(ToOwned::to_owned);
            let domain = url.as_deref().and_then(domain_from_url);

            for (sentence_idx, sentence) in split_sentences(text).into_iter().enumerate() {
                let candidate = Candidate {
                    resource_id: resource_id.clone(),
                    doc_id: format!("{shard_name}:{}#s{}", line_idx + 1, sentence_idx + 1),
                    title: None,
                    url: url.clone(),
                    domain: domain.clone(),
                    genre: Some("web".to_owned()),
                    quality: None,
                    sentence,
                };
                if tx.send(Ok(candidate)).is_err() {
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

fn run_parquet_dir(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let mut parquet_paths = files_with_suffix(&path, ".parquet")?;
    parquet_paths.sort();

    for parquet_path in parquet_paths {
        let shard_name = parquet_path
            .strip_prefix(&path)
            .unwrap_or(&parquet_path)
            .to_string_lossy()
            .into_owned();
        let file = File::open(&parquet_path)?;
        let reader = SerializedFileReader::new(file)?;
        let rows = reader.get_row_iter(None)?;

        for (row_idx, row) in rows.enumerate() {
            let row = row?;
            let mut texts = Vec::new();
            collect_row_strings(&row, &mut texts);
            for (field_idx, text) in texts.into_iter().enumerate() {
                for (sentence_idx, sentence) in split_sentences(&text).into_iter().enumerate() {
                    let candidate = Candidate {
                        resource_id: resource_id.clone(),
                        doc_id: format!(
                            "{shard_name}:{}:{}#s{}",
                            row_idx + 1,
                            field_idx + 1,
                            sentence_idx + 1
                        ),
                        title: Some(shard_name.clone()),
                        url: None,
                        domain: Some("huggingface.co".to_owned()),
                        genre: Some("parquet".to_owned()),
                        quality: None,
                        sentence,
                    };
                    if tx.send(Ok(candidate)).is_err() {
                        return Ok(());
                    }
                }
            }
        }
    }

    Ok(())
}

fn run_wikimedia_xml_bz2_dir(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let mut dump_paths = files_with_suffix(&path, ".xml.bz2")?;
    dump_paths.sort();

    for dump_path in dump_paths {
        let dump_name = dump_path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("wikimedia.xml.bz2")
            .to_owned();
        let file = File::open(&dump_path)?;
        let decoder = BzDecoder::new(file);
        let mut reader = XmlReader::from_reader(BufReader::new(decoder));
        let mut buf = Vec::new();
        let mut title = None;
        let mut page_id = None;
        let mut ns = None;
        let mut text = String::new();
        let mut in_title = false;
        let mut in_id = false;
        let mut page_id_seen = false;
        let mut in_ns = false;
        let mut in_text = false;

        loop {
            match reader.read_event_into(&mut buf)? {
                Event::Start(event) if event.name().as_ref() == b"page" => {
                    title = None;
                    page_id = None;
                    ns = None;
                    text.clear();
                    page_id_seen = false;
                }
                Event::Start(event) if event.name().as_ref() == b"title" => in_title = true,
                Event::Start(event) if event.name().as_ref() == b"ns" => in_ns = true,
                Event::Start(event) if event.name().as_ref() == b"id" && !page_id_seen => {
                    in_id = true;
                }
                Event::Start(event) if event.name().as_ref() == b"text" => in_text = true,
                Event::Text(event) if in_title => {
                    title = Some(decode_xml_bytes(&reader, event.as_ref())?);
                }
                Event::Text(event) if in_ns => {
                    ns = Some(decode_xml_bytes(&reader, event.as_ref())?);
                }
                Event::Text(event) if in_id => {
                    page_id = Some(decode_xml_bytes(&reader, event.as_ref())?);
                    page_id_seen = true;
                }
                Event::Text(event) if in_text => {
                    text.push_str(&decode_xml_bytes(&reader, event.as_ref())?);
                }
                Event::CData(event) if in_text => {
                    text.push_str(&decode_xml_bytes(&reader, event.as_ref())?);
                }
                Event::End(event) if event.name().as_ref() == b"title" => in_title = false,
                Event::End(event) if event.name().as_ref() == b"ns" => in_ns = false,
                Event::End(event) if event.name().as_ref() == b"id" => in_id = false,
                Event::End(event) if event.name().as_ref() == b"text" => in_text = false,
                Event::End(event) if event.name().as_ref() == b"page" => {
                    if ns.as_deref() == Some("0") && !text.trim().is_empty() {
                        let clean = strip_wiki_markup(&text);
                        let doc_id = page_id.clone().unwrap_or_else(|| "unknown-page".to_owned());
                        for (sentence_idx, sentence) in
                            split_sentences(&clean).into_iter().enumerate()
                        {
                            let candidate = Candidate {
                                resource_id: resource_id.clone(),
                                doc_id: format!("{dump_name}:{doc_id}#s{}", sentence_idx + 1),
                                title: title.clone(),
                                url: None,
                                domain: Some("wikimedia.org".to_owned()),
                                genre: Some("wikimedia".to_owned()),
                                quality: None,
                                sentence,
                            };
                            if tx.send(Ok(candidate)).is_err() {
                                return Ok(());
                            }
                        }
                    }
                    text.clear();
                }
                Event::Eof => break,
                _ => {}
            }
            buf.clear();
        }
    }

    Ok(())
}

fn run_tatoeba_tar_bz2_dir(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let archive_path = path.join("sentences_detailed.tar.bz2");
    let file = File::open(&archive_path)?;
    let decoder = BzDecoder::new(file);
    let mut archive = TarArchive::new(decoder);

    for entry in archive.entries()? {
        let entry = entry?;
        let member_name = entry.path()?.to_string_lossy().into_owned();
        if !member_name.ends_with("sentences_detailed.csv") {
            continue;
        }

        let reader = BufReader::new(entry);
        for line in reader.lines() {
            let line = line?;
            let mut parts = line.splitn(4, '\t');
            let Some(sentence_id) = parts.next() else {
                continue;
            };
            let Some(lang) = parts.next() else {
                continue;
            };
            let Some(text) = parts.next() else {
                continue;
            };
            if lang != "sqi" && lang != "sq" {
                continue;
            }
            for (sentence_idx, sentence) in split_sentences(text).into_iter().enumerate() {
                let candidate = Candidate {
                    resource_id: resource_id.clone(),
                    doc_id: format!("{sentence_id}#s{}", sentence_idx + 1),
                    title: Some("Tatoeba".to_owned()),
                    url: Some(format!(
                        "https://tatoeba.org/en/sentences/show/{sentence_id}"
                    )),
                    domain: Some("tatoeba.org".to_owned()),
                    genre: Some("parallel".to_owned()),
                    quality: None,
                    sentence,
                };
                if tx.send(Ok(candidate)).is_err() {
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

fn run_ud_conllu_zip(
    path: PathBuf,
    resource_id: String,
    tx: SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let file = File::open(path)?;
    let mut archive = ZipArchive::new(file)?;
    let member_names = zip_member_names(&mut archive, |name| name.ends_with(".conllu"))?;

    for member_name in member_names {
        let member = archive.by_name(&member_name)?;
        stream_conllu_member(BufReader::new(member), &resource_id, &member_name, &tx)?;
    }

    Ok(())
}

fn stream_conllu_member<R: BufRead>(
    reader: R,
    resource_id: &str,
    member_name: &str,
    tx: &SyncSender<SourceResult<Candidate>>,
) -> SourceResult<()> {
    let mut text = None;
    let mut sent_id = None;
    let mut source = None;
    let mut sentence_index = 0usize;

    for line in reader.lines() {
        let line = line?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !emit_conllu_candidate(
                resource_id,
                member_name,
                tx,
                &mut text,
                &mut sent_id,
                &mut source,
                &mut sentence_index,
            )? {
                return Ok(());
            }
            continue;
        }

        if let Some(value) = trimmed.strip_prefix("# text = ") {
            text = Some(value.to_owned());
        } else if let Some(value) = trimmed.strip_prefix("# sent_id = ") {
            sent_id = Some(value.to_owned());
        } else if let Some(value) = trimmed.strip_prefix("# source = ") {
            source = Some(value.to_owned());
        }
    }

    emit_conllu_candidate(
        resource_id,
        member_name,
        tx,
        &mut text,
        &mut sent_id,
        &mut source,
        &mut sentence_index,
    )?;
    Ok(())
}

fn emit_conllu_candidate(
    resource_id: &str,
    member_name: &str,
    tx: &SyncSender<SourceResult<Candidate>>,
    text: &mut Option<String>,
    sent_id: &mut Option<String>,
    source: &mut Option<String>,
    sentence_index: &mut usize,
) -> SourceResult<bool> {
    let Some(raw_text) = text.take() else {
        *sent_id = None;
        *source = None;
        return Ok(true);
    };

    *sentence_index += 1;
    let sentence = normalize_text(&raw_text);
    if sentence.is_empty() {
        *sent_id = None;
        *source = None;
        return Ok(true);
    }

    let doc_id = sent_id
        .take()
        .unwrap_or_else(|| format!("{member_name}:{}", *sentence_index));
    let candidate = Candidate {
        resource_id: resource_id.to_owned(),
        doc_id,
        title: source.take(),
        url: None,
        domain: Some("universaldependencies.org".to_owned()),
        genre: Some("treebank".to_owned()),
        quality: Some("good".to_owned()),
        sentence,
    };

    Ok(tx.send(Ok(candidate)).is_ok())
}

#[derive(Default)]
struct DocMeta {
    id: Option<String>,
    title: Option<String>,
    url: Option<String>,
    domain: Option<String>,
}

#[derive(Default)]
struct ParaMeta {
    id: Option<String>,
    quality: Option<String>,
}

fn zip_member_names<R, F>(archive: &mut ZipArchive<R>, mut keep: F) -> SourceResult<Vec<String>>
where
    R: Read + io::Seek,
    F: FnMut(&str) -> bool,
{
    let mut names = Vec::new();
    for idx in 0..archive.len() {
        let member = archive.by_index(idx)?;
        let name = member.name();
        if keep(name) {
            names.push(name.to_owned());
        }
    }
    names.sort();
    Ok(names)
}

fn first_zip_member_name<R, F>(
    archive: &mut ZipArchive<R>,
    mut keep: F,
) -> SourceResult<Option<String>>
where
    R: Read + io::Seek,
    F: FnMut(&str) -> bool,
{
    for idx in 0..archive.len() {
        let member = archive.by_index(idx)?;
        let name = member.name();
        if keep(name) {
            return Ok(Some(name.to_owned()));
        }
    }
    Ok(None)
}

fn source_kind(id: &str, format: Option<&str>) -> Option<SourceKind> {
    match (id, format.unwrap_or_default()) {
        ("macocu-genre-sq", "jsonl.gz") => Some(SourceKind::MacocuGenreJsonlGz),
        ("macocu-sq-1.0-xml", "xml.zip") => Some(SourceKind::MacocuXmlZip),
        ("cc100-sq", "txt.xz") => Some(SourceKind::Cc100XzLines),
        ("hplt-v3-als-latn", "jsonl.zst shards") => Some(SourceKind::HpltJsonlZstDir),
        ("leipzig-sqi", "tar.gz sentence archives") => Some(SourceKind::LeipzigTarGzDir),
        ("mc4-sq", "json.gz shards") => Some(SourceKind::Mc4JsonGzDir),
        (
            "hf-albanian-wiki-clean-lm"
            | "hf-albanian-english-bundled"
            | "hf-bigmind-albanian"
            | "hf-albanian-wikiorca"
            | "fineweb2-albanian-varieties",
            "Parquet shards",
        ) => Some(SourceKind::ParquetDir),
        ("wikimedia-sq-latest", "MediaWiki XML bz2 dumps") => Some(SourceKind::WikimediaXmlBz2Dir),
        ("seeuniversity-albanian-corpora-bert", "txt") => Some(SourceKind::SeeUniversityTxtLines),
        ("opus-en-sq-moses-latest", "Moses text zip files")
        | ("opus-all-to-sq-moses-latest", "Moses text zip files") => {
            Some(SourceKind::OpusMosesZipDir)
        }
        ("tatoeba-full", "tar.bz2 exports") => Some(SourceKind::TatoebaTarBz2Dir),
        ("ud-albanian-staf", "CoNLL-U zip") | ("ud-albanian-tsa", "CoNLL-U zip") => {
            Some(SourceKind::UdConlluZip)
        }
        _ => None,
    }
}

fn files_with_suffix(path: &Path, suffix: &str) -> SourceResult<Vec<PathBuf>> {
    let mut paths = Vec::new();
    collect_files_with_suffix(path, suffix, &mut paths)?;
    paths.sort();
    Ok(paths)
}

fn partition_name(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn collect_files_with_suffix(
    path: &Path,
    suffix: &str,
    paths: &mut Vec<PathBuf>,
) -> SourceResult<()> {
    if path.is_file() {
        if path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.ends_with(suffix))
        {
            paths.push(path.to_owned());
        }
        return Ok(());
    }

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        collect_files_with_suffix(&entry.path(), suffix, paths)?;
    }
    Ok(())
}

fn collect_row_strings(row: &Row, texts: &mut Vec<String>) {
    for (_, field) in row.get_column_iter() {
        collect_field_strings(field, texts);
    }
}

fn collect_field_strings(field: &Field, texts: &mut Vec<String>) {
    match field {
        Field::Str(value) if useful_text(value) => texts.push(value.to_owned()),
        Field::Bytes(value) => {
            if let Ok(text) = value.as_utf8() {
                if useful_text(text) {
                    texts.push(text.to_owned());
                }
            }
        }
        Field::Group(row) => collect_row_strings(row, texts),
        Field::ListInternal(values) => {
            for value in values.elements() {
                collect_field_strings(value, texts);
            }
        }
        Field::MapInternal(values) => {
            for (key, value) in values.entries() {
                collect_field_strings(key, texts);
                collect_field_strings(value, texts);
            }
        }
        _ => {}
    }
}

fn useful_text(value: &str) -> bool {
    value.chars().any(char::is_alphabetic) && value.split_whitespace().count() >= 3
}

fn strip_wiki_markup(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    let mut brace_depth = 0usize;
    let mut link_depth = 0usize;
    let mut link_text = String::new();

    while let Some(ch) = chars.next() {
        if ch == '{' && chars.peek() == Some(&'{') {
            chars.next();
            brace_depth += 1;
            continue;
        }
        if ch == '}' && chars.peek() == Some(&'}') && brace_depth > 0 {
            chars.next();
            brace_depth -= 1;
            continue;
        }
        if brace_depth > 0 {
            continue;
        }
        if ch == '[' && chars.peek() == Some(&'[') {
            chars.next();
            link_depth += 1;
            link_text.clear();
            continue;
        }
        if ch == ']' && chars.peek() == Some(&']') && link_depth > 0 {
            chars.next();
            link_depth -= 1;
            out.push_str(&link_text);
            link_text.clear();
            out.push(' ');
            continue;
        }
        if link_depth > 0 {
            if ch == '|' {
                link_text.clear();
            } else {
                link_text.push(ch);
            }
            continue;
        }
        if matches!(ch, '[' | ']' | '\'' | '=') {
            out.push(' ');
        } else {
            out.push(ch);
        }
    }

    out
}

fn domain_from_url(url: &str) -> Option<String> {
    let rest = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))?;
    rest.split('/')
        .next()
        .and_then(|host| host.split(':').next())
        .filter(|host| !host.is_empty())
        .map(ToOwned::to_owned)
}

fn str_field<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value.get(key).and_then(Value::as_str)
}

fn attr_value(event: &BytesStart<'_>, key: &[u8]) -> Option<String> {
    event.attributes().flatten().find_map(|attr| {
        if attr.key.as_ref() == key {
            Some(String::from_utf8_lossy(attr.value.as_ref()).into_owned())
        } else {
            None
        }
    })
}

fn decode_xml_bytes<R: BufRead>(reader: &XmlReader<R>, bytes: &[u8]) -> SourceResult<String> {
    Ok(reader.decoder().decode(bytes)?.into_owned())
}

fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut sentence = String::new();

    for ch in text.chars() {
        if ch == '\n' || ch == '\r' {
            push_normalized(&mut sentences, &mut sentence);
            continue;
        }

        sentence.push(ch);
        if matches!(ch, '.' | '!' | '?' | '…') {
            push_normalized(&mut sentences, &mut sentence);
        }
    }

    push_normalized(&mut sentences, &mut sentence);
    sentences
}

fn push_normalized(sentences: &mut Vec<String>, text: &mut String) {
    let sentence = normalize_text(text);
    text.clear();
    if sentence.chars().any(char::is_alphanumeric) {
        sentences.push(sentence);
    }
}

fn normalize_text(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn invalid_data(message: impl Into<String>) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message.into())
}
