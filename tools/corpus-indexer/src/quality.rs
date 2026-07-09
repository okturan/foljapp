use crate::text::tokens_for;

const ADULT_OR_SPAM_WORDS: &[&str] = &[
    "anal",
    "blowjob",
    "boobs",
    "cumshot",
    "deepthroat",
    "dildo",
    "hardcore",
    "lezbike",
    "lesbo",
    "pidhi",
    "porno",
    "strapon",
];

const ADULT_OR_SPAM_STEMS: &[&str] = &["fetish", "lesbian", "masturb", "orgazm", "porn"];

const ADULT_OR_SPAM_PHRASES: &[&str] = &["rrip-në"];

const REFERENCE_PROSE_HINTS: &[&str] = &[
    "conjugation",
    "declension",
    "first-person",
    "grammar",
    "indicative",
    "lidhor",
    "morfologjik",
    "paskajor",
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
    "format e së ardhmes",
];

pub fn quality_flags(sentence: &str, normalized: &str, quality: Option<&str>) -> Vec<String> {
    let mut flags = Vec::new();
    let lower = sentence.to_lowercase();
    if let Some(value) = quality {
        if value != "good" && value != "neargood" {
            flags.push("low_quality".to_string());
        }
    }
    if adult_or_spam(&lower) {
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
        .any(|hint| contains_phrase_hint(&lower, hint))
    {
        flags.push("reference_prose".to_string());
    }
    if sentence
        .chars()
        .any(|ch| ch < ' ' && !matches!(ch, '\t' | '\n' | '\r'))
    {
        flags.push("control_char".to_string());
    }
    let token_count = normalized.split_whitespace().count();
    if sentence.matches(',').count() >= 3 && token_count <= 18 {
        flags.push("inflection_list".to_string());
    }
    if dense_inflection_list(sentence, &lower) {
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

fn adult_or_spam(lower: &str) -> bool {
    let tokens = tokens_for(lower);
    ADULT_OR_SPAM_WORDS
        .iter()
        .any(|term| tokens.iter().any(|token| token == term))
        || tokens.iter().any(|token| is_adult_sex_token(token))
        || ADULT_OR_SPAM_STEMS.iter().any(|stem| lower.contains(stem))
        || ADULT_OR_SPAM_PHRASES
            .iter()
            .any(|phrase| contains_phrase_hint(lower, phrase))
}

fn is_adult_sex_token(token: &str) -> bool {
    matches!(token, "seks" | "seksi" | "seksin" | "seksit") || token.starts_with("seksual")
}

fn contains_phrase_hint(lower: &str, hint: &str) -> bool {
    lower.match_indices(hint).any(|(start, _)| {
        let end = start + hint.len();
        let left_ok = lower[..start]
            .chars()
            .next_back()
            .is_none_or(|ch| !ch.is_alphabetic());
        let right_ok = lower[end..]
            .chars()
            .next()
            .is_none_or(|ch| !ch.is_alphabetic());
        left_ok && right_ok
    })
}

fn dense_inflection_list(sentence: &str, lower: &str) -> bool {
    lower.contains("e kështu me radhë")
        && sentence.matches(',').count() >= 3
        && sentence.matches(';').count() >= 1
}

#[cfg(test)]
mod tests {
    use crate::text::tokens_for;

    use super::{keep_sentence, quality_flags};

    #[test]
    fn rejects_dense_inflection_list_prose() {
        let sentence = "qenkam, qenkësha; paskam qenë, paskësha qenë; punuekam a punuakam, punuekësha a punuakësha e kështu me radhë.";
        let normalized = tokens_for(sentence).join(" ");
        let flags = quality_flags(sentence, &normalized, Some("good"));

        assert!(flags.iter().any(|flag| flag == "inflection_list"));
        assert!(!keep_sentence(&flags));
    }

    #[test]
    fn rejects_grammar_reference_prose() {
        let sentence = "Në sistemin morfologjik, dialekti i veriut ka formën e paskajores së tipit me punue, kurse toskërishtja në vend të saj, përdor lidhoren të punoj.";
        let normalized = tokens_for(sentence).join(" ");
        let flags = quality_flags(sentence, &normalized, Some("good"));

        assert!(flags.iter().any(|flag| flag == "reference_prose"));
        assert!(!keep_sentence(&flags));
    }

    #[test]
    fn reference_prose_hints_respect_word_boundaries() {
        let sentence = "Ti ke caktuar dy trajnerë për ekipin.";
        let normalized = tokens_for(sentence).join(" ");
        let flags = quality_flags(sentence, &normalized, Some("good"));

        assert!(!flags.iter().any(|flag| flag == "reference_prose"));
    }

    #[test]
    fn reference_prose_still_rejects_bounded_hints() {
        let sentence = "Emri shfaq formën e caktuar në këtë tabelë gramatikore.";
        let normalized = tokens_for(sentence).join(" ");
        let flags = quality_flags(sentence, &normalized, Some("good"));

        assert!(flags.iter().any(|flag| flag == "reference_prose"));
        assert!(!keep_sentence(&flags));
    }

    #[test]
    fn adult_spam_words_do_not_match_inside_normal_words() {
        let sentence = "Analiza e tekstit përmend një seksion dhe batuta seksiste.";
        let normalized = tokens_for(sentence).join(" ");
        let flags = quality_flags(sentence, &normalized, Some("good"));

        assert!(!flags.iter().any(|flag| flag == "adult_or_spam"));
    }

    #[test]
    fn adult_spam_still_rejects_explicit_terms_and_stems() {
        let sentence = "Ky dokument përmban pornografi dhe spam.";
        let normalized = tokens_for(sentence).join(" ");
        let flags = quality_flags(sentence, &normalized, Some("good"));

        assert!(flags.iter().any(|flag| flag == "adult_or_spam"));
        assert!(!keep_sentence(&flags));
    }

    #[test]
    fn adult_spam_still_rejects_albanian_sexual_terms() {
        let sentence = "Teksti përmban materiale seksuale dhe diskutime për seksin.";
        let normalized = tokens_for(sentence).join(" ");
        let flags = quality_flags(sentence, &normalized, Some("good"));

        assert!(flags.iter().any(|flag| flag == "adult_or_spam"));
        assert!(!keep_sentence(&flags));
    }
}
