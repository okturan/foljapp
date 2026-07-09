pub fn normalize_token(token: &str) -> String {
    token.trim().chars().flat_map(char::to_lowercase).collect()
}

pub fn tokens_for(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        if is_word_char(ch) {
            current.extend(ch.to_lowercase());
        } else if !current.is_empty() {
            tokens.push(std::mem::take(&mut current));
        }
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

pub fn normalized_text(text: &str) -> String {
    let mut normalized = String::new();
    let mut in_token = false;

    for ch in text.chars() {
        if is_word_char(ch) {
            if !in_token {
                if !normalized.is_empty() {
                    normalized.push(' ');
                }
                in_token = true;
            }
            normalized.extend(ch.to_lowercase());
        } else {
            in_token = false;
        }
    }

    normalized
}

fn is_word_char(ch: char) -> bool {
    ch == '_' || ch.is_alphanumeric()
}

#[cfg(test)]
mod tests {
    use super::{normalize_token, normalized_text, tokens_for};

    #[test]
    fn keeps_albanian_letters_as_word_chars() {
        let tokens = tokens_for("Punoj, T\u{00cb} punoj\u{00eb}; \u{00c7}aj B\u{00cb}J");

        assert_eq!(
            tokens,
            vec![
                "punoj",
                "t\u{00eb}",
                "punoj\u{00eb}",
                "\u{00e7}aj",
                "b\u{00eb}j"
            ]
        );
    }

    #[test]
    fn mirrors_python_word_token_normalization() {
        assert_eq!(tokens_for("A_12 + b-34"), vec!["a_12", "b", "34"]);
        assert_eq!(normalize_token("  PUNOJ  "), "punoj");
    }

    #[test]
    fn normalizes_text_without_allocating_token_vecs() {
        assert_eq!(normalized_text("A_12 + b-34"), "a_12 b 34");
        assert_eq!(
            normalized_text("Punoj, T\u{00cb} punoj\u{00eb}; \u{00c7}aj"),
            "punoj t\u{00eb} punoj\u{00eb} \u{00e7}aj"
        );
    }
}
