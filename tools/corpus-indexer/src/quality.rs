use crate::text::tokens_for;

const ADULT_OR_SPAM_TERMS: &[&str] = &[
    "anal",
    "blowjob",
    "boobs",
    "cumshot",
    "deepthroat",
    "dildo",
    "fetish",
    "hardcore",
    "lezbike",
    "lesbian",
    "lesbo",
    "masturb",
    "orgazm",
    "pidhi",
    "porn",
    "porno",
    "rrip-në",
    "seksi",
    "strapon",
];

const REFERENCE_PROSE_HINTS: &[&str] = &[
    "conjugation",
    "declension",
    "first-person",
    "grammar",
    "indicative",
    "participle",
    "subjunctive",
    "veta e",
    "koha e",
    "mënyra",
    "pjesorja",
    "e ardhmja",
    "e caktuar",
    "e pacaktuar",
    "e tashmja",
];

pub fn quality_flags(sentence: &str, normalized: &str, quality: Option<&str>) -> Vec<String> {
    let mut flags = Vec::new();
    let lower = sentence.to_lowercase();
    if let Some(value) = quality {
        if value != "good" && value != "neargood" {
            flags.push("low_quality".to_string());
        }
    }
    if ADULT_OR_SPAM_TERMS.iter().any(|term| lower.contains(term)) {
        flags.push("adult_or_spam".to_string());
    }
    if sentence.contains('<')
        || sentence.contains('>')
        || sentence.contains("&lt;")
        || sentence.contains("&gt;")
    {
        flags.push("markup".to_string());
    }
    if REFERENCE_PROSE_HINTS
        .iter()
        .any(|hint| lower.contains(hint))
    {
        flags.push("reference_prose".to_string());
    }
    if sentence
        .chars()
        .any(|ch| ch < ' ' && !matches!(ch, '\t' | '\n' | '\r'))
    {
        flags.push("control_char".to_string());
    }
    let token_count = tokens_for(normalized).len();
    if sentence.matches(',').count() >= 3 && token_count <= 18 {
        flags.push("inflection_list".to_string());
    }
    if repeated_future_marker(&lower) {
        flags.push("inflection_list".to_string());
    }
    if token_count < 4 {
        flags.push("too_short".to_string());
    }
    if sentence.len() > 420 {
        flags.push("too_long".to_string());
    }
    if sentence.chars().filter(|ch| ch.is_ascii_digit()).count() > 12 {
        flags.push("digit_heavy".to_string());
    }
    flags
}

pub fn keep_sentence(flags: &[String]) -> bool {
    !flags.iter().any(|flag| {
        matches!(
            flag.as_str(),
            "adult_or_spam"
                | "markup"
                | "too_short"
                | "too_long"
                | "digit_heavy"
                | "inflection_list"
                | "control_char"
                | "reference_prose"
        )
    })
}

fn repeated_future_marker(lower: &str) -> bool {
    let tokens = tokens_for(lower);
    tokens.windows(5).any(|window| {
        window[0] == "do" && window[1] == "të" && window[3] == "do" && window[4] == "të"
    })
}
