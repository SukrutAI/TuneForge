/**
 * Language Utilities Module
 * 
 * Provides centralized functionality for language-related operations:
 * - Language code mappings (full name to ISO 639 code)
 * - Language name mappings (ISO code to full name)
 * - Language groupings (common, Indic, etc.)
 * - Utility functions for language code normalization
 * - Language domain detection
 */

/**
 * Maps language full names to standard ISO 639 language codes
 * Comprehensive list of 100+ global languages and 30+ Indian languages
 */
export const LANGUAGE_CODE_MAP: { [key: string]: string } = {
    // Major Global Languages
    'english': 'en',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'chinese': 'zh',
    'mandarin': 'zh',
    'cantonese': 'zh-hk',
    'japanese': 'ja',
    'korean': 'ko',
    'russian': 'ru',
    'portuguese': 'pt',
    'italian': 'it',
    'dutch': 'nl',
    'arabic': 'ar',
    'turkish': 'tr',
    'polish': 'pl',
    'vietnamese': 'vi',
    'thai': 'th',
    'indonesian': 'id',
    'malay': 'ms',
    'swahili': 'sw',

    // Indic Languages (30+ Indian and related languages)
    'hindi': 'hi',
    'bengali': 'bn',
    'telugu': 'te',
    'tamil': 'ta',
    'marathi': 'mr',
    'gujarati': 'gu',
    'kannada': 'kn',
    'malayalam': 'ml',
    'punjabi': 'pa',
    'odia': 'or',
    'oriya': 'or',
    'assamese': 'as',
    'sanskrit': 'sa',
    'urdu': 'ur',
    'sindhi': 'sd',
    'kashmiri': 'ks',
    'konkani': 'kok',
    'manipuri': 'mni',
    'bodo': 'brx',
    'dogri': 'doi',
    'maithili': 'mai',
    'santali': 'sat',
    'nepali': 'ne',
    'sinhala': 'si',
    'dhivehi': 'dv',
    'tulu': 'tcy',
    'bhojpuri': 'bho',
    'magahi': 'mag',
    'chhattisgarhi': 'hne',
    'haryanvi': 'bgc',
    'rajasthani': 'raj',
    'sylheti': 'syl',
    'garhwali': 'gbm',
    'kumaoni': 'kfy',
    'ladakhi': 'lbj',
    'lepcha': 'lep',
    'mizo': 'lus',

    // European Languages
    'albanian': 'sq',
    'armenian': 'hy',
    'basque': 'eu',
    'belarusian': 'be',
    'bosnian': 'bs',
    'bulgarian': 'bg',
    'catalan': 'ca',
    'croatian': 'hr',
    'czech': 'cs',
    'danish': 'da',
    'estonian': 'et',
    'finnish': 'fi',
    'galician': 'gl',
    'georgian': 'ka',
    'greek': 'el',
    'hungarian': 'hu',
    'icelandic': 'is',
    'irish': 'ga',
    'latvian': 'lv',
    'lithuanian': 'lt',
    'luxembourgish': 'lb',
    'macedonian': 'mk',
    'maltese': 'mt',
    'moldovan': 'ro-md',
    'norwegian': 'no',
    'romanian': 'ro',
    'serbian': 'sr',
    'slovak': 'sk',
    'slovenian': 'sl',
    'swedish': 'sv',
    'ukrainian': 'uk',
    'welsh': 'cy',

    // African Languages
    'afrikaans': 'af',
    'amharic': 'am',
    'hausa': 'ha',
    'igbo': 'ig',
    'kinyarwanda': 'rw',
    'luganda': 'lg',
    'malagasy': 'mg',
    'sesotho': 'st',
    'shona': 'sn',
    'somali': 'so',
    'tigrinya': 'ti',
    'tsonga': 'ts',
    'tswana': 'tn',
    'wolof': 'wo',
    'xhosa': 'xh',
    'yoruba': 'yo',
    'zulu': 'zu',

    // Middle Eastern Languages
    'azerbaijani': 'az',
    'farsi': 'fa',
    'persian': 'fa',
    'hebrew': 'he',
    'kurdish': 'ku',
    'pashto': 'ps',
    'tajik': 'tg',
    'turkmen': 'tk',
    'uzbek': 'uz',

    // East Asian Languages
    'burmese': 'my',
    'hmong': 'hmn',
    'khmer': 'km',
    'lao': 'lo',
    'mongolian': 'mn',
    'tibetan': 'bo',

    // Pacific Languages
    'fijian': 'fj',
    'hawaiian': 'haw',
    'maori': 'mi',
    'samoan': 'sm',
    'tahitian': 'ty',
    'tongan': 'to',

    // American Languages
    'cherokee': 'chr',
    'guarani': 'gn',
    'inuktitut': 'iu',
    'maya': 'yua',
    'nahuatl': 'nah',
    'navajo': 'nv',
    'quechua': 'qu',

    // Constructed Languages
    'esperanto': 'eo',
    'interlingua': 'ia',
    'klingon': 'tlh',
    'lojban': 'jbo',
    'toki pona': 'tok',

    // Common misspellings and alternative names
    'arbic': 'ar',
    'bangla': 'bn',
    'bhasa indonesia': 'id',
    'brasileiro': 'pt-br',
    'castellano': 'es',
    'filipino': 'fil',
    'gaelic': 'gd',
    'hindustani': 'hi',
    'letzeburgesch': 'lb',
    'mandarin chinese': 'zh',
    'simplified chinese': 'zh-cn',
    'traditional chinese': 'zh-tw',
    'taiwanese': 'zh-tw',
    'castilian': 'es',
    'valencian': 'ca',
    'brasileiro português': 'pt-br'
};

/**
 * Maps ISO 639 language codes to full language names
 */
export const LANGUAGE_NAME_MAP: { [key: string]: string } = {
    // Major Global Languages
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese',
    'zh-cn': 'Chinese (Simplified)',
    'zh-tw': 'Chinese (Traditional)',
    'zh-hk': 'Cantonese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'pt-br': 'Brazilian Portuguese',
    'it': 'Italian',
    'nl': 'Dutch',
    'ar': 'Arabic',
    'tr': 'Turkish',
    'pl': 'Polish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian',
    'ms': 'Malay',
    'sw': 'Swahili',

    // Indic Languages
    'hi': 'Hindi',
    'bn': 'Bengali',
    'te': 'Telugu',
    'ta': 'Tamil',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi',
    'or': 'Odia',
    'as': 'Assamese',
    'sa': 'Sanskrit',
    'ur': 'Urdu',
    'sd': 'Sindhi',
    'ks': 'Kashmiri',
    'kok': 'Konkani',
    'mni': 'Manipuri',
    'brx': 'Bodo',
    'doi': 'Dogri',
    'mai': 'Maithili',
    'sat': 'Santali',
    'ne': 'Nepali',
    'si': 'Sinhala',
    'dv': 'Dhivehi',
    'tcy': 'Tulu',
    'bho': 'Bhojpuri',
    'mag': 'Magahi',
    'hne': 'Chhattisgarhi',
    'bgc': 'Haryanvi',
    'raj': 'Rajasthani',
    'syl': 'Sylheti',
    'gbm': 'Garhwali',
    'kfy': 'Kumaoni',
    'lbj': 'Ladakhi',
    'lep': 'Lepcha',
    'lus': 'Mizo',

    // European Languages
    'sq': 'Albanian',
    'hy': 'Armenian',
    'eu': 'Basque',
    'be': 'Belarusian',
    'bs': 'Bosnian',
    'bg': 'Bulgarian',
    'ca': 'Catalan',
    'hr': 'Croatian',
    'cs': 'Czech',
    'da': 'Danish',
    'et': 'Estonian',
    'fi': 'Finnish',
    'gl': 'Galician',
    'ka': 'Georgian',
    'el': 'Greek',
    'hu': 'Hungarian',
    'is': 'Icelandic',
    'ga': 'Irish',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'lb': 'Luxembourgish',
    'mk': 'Macedonian',
    'mt': 'Maltese',
    'ro-md': 'Moldovan',
    'no': 'Norwegian',
    'ro': 'Romanian',
    'sr': 'Serbian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'sv': 'Swedish',
    'uk': 'Ukrainian',
    'cy': 'Welsh',

    // African Languages
    'af': 'Afrikaans',
    'am': 'Amharic',
    'ha': 'Hausa',
    'ig': 'Igbo',
    'rw': 'Kinyarwanda',
    'lg': 'Luganda',
    'mg': 'Malagasy',
    'st': 'Sesotho',
    'sn': 'Shona',
    'so': 'Somali',
    'ti': 'Tigrinya',
    'ts': 'Tsonga',
    'tn': 'Tswana',
    'wo': 'Wolof',
    'xh': 'Xhosa',
    'yo': 'Yoruba',
    'zu': 'Zulu',

    // Middle Eastern Languages
    'az': 'Azerbaijani',
    'fa': 'Persian',
    'he': 'Hebrew',
    'ku': 'Kurdish',
    'ps': 'Pashto',
    'tg': 'Tajik',
    'tk': 'Turkmen',
    'uz': 'Uzbek',

    // East Asian Languages
    'my': 'Burmese',
    'hmn': 'Hmong',
    'km': 'Khmer',
    'lo': 'Lao',
    'mn': 'Mongolian',
    'bo': 'Tibetan',

    // Pacific Languages
    'fj': 'Fijian',
    'haw': 'Hawaiian',
    'mi': 'Maori',
    'sm': 'Samoan',
    'ty': 'Tahitian',
    'to': 'Tongan',

    // American Languages
    'chr': 'Cherokee',
    'gn': 'Guarani',
    'iu': 'Inuktitut',
    'yua': 'Maya',
    'nah': 'Nahuatl',
    'nv': 'Navajo',
    'qu': 'Quechua',

    // Constructed Languages
    'eo': 'Esperanto',
    'ia': 'Interlingua',
    'tlh': 'Klingon',
    'jbo': 'Lojban',
    'tok': 'Toki Pona'
};

/**
 * Common language codes for diverse dataset generation
 * Covers major world languages with significant speaker populations
 */
export const COMMON_LANGUAGE_CODES = [
    "en", "es", "fr", "de", "zh", "ja", "ko", "ru", "pt", "ar",
    "hi", "id", "tr", "vi", "it", "pl", "nl", "th", "fa", "sw"
];

/**
 * Indic language codes for specialized Indian language datasets
 * Covers all official languages of India and major regional languages
 */
export const INDIC_LANGUAGE_CODES = [
    // Official languages of India listed in the 8th Schedule
    "hi", // Hindi
    "bn", // Bengali
    "te", // Telugu
    "ta", // Tamil
    "mr", // Marathi
    "gu", // Gujarati
    "kn", // Kannada
    "ml", // Malayalam
    "pa", // Punjabi
    "or", // Odia
    "as", // Assamese
    "sa", // Sanskrit
    "ur", // Urdu
    "sd", // Sindhi
    "ks", // Kashmiri
    "kok", // Konkani
    "mni", // Manipuri
    "brx", // Bodo
    "doi", // Dogri
    "mai", // Maithili
    "sat", // Santali
    "ne", // Nepali

    // Other significant regional languages
    "bho", // Bhojpuri
    "mag", // Magahi
    "hne", // Chhattisgarhi
    "bgc", // Haryanvi
    "raj", // Rajasthani
    "syl", // Sylheti
    "gbm", // Garhwali
    "kfy", // Kumaoni
    "tcy", // Tulu
    "lbj", // Ladakhi
    "lus", // Mizo
    "lep"  // Lepcha
];

/**
 * European language codes for specialized European datasets
 */
export const EUROPEAN_LANGUAGE_CODES = [
    "en", "de", "fr", "es", "it", "pt", "nl", "pl", "sv", "da",
    "fi", "el", "cs", "ro", "hu", "bg", "hr", "sk", "lt", "sl",
    "et", "lv", "ga", "mt", "cy", "eu"
];

/**
 * East Asian language codes
 */
export const EAST_ASIAN_LANGUAGE_CODES = [
    "zh", "ja", "ko", "vi", "th", "km", "lo", "my", "ms", "id", "tl"
];

/**
 * African language codes
 */
export const AFRICAN_LANGUAGE_CODES = [
    "sw", "am", "ha", "yo", "ig", "zu", "xh", "af", "so", "rw",
    "sn", "st", "wo", "lg", "ti", "mg"
];

/**
 * Normalizes a language identifier to a standard ISO code
 * Handles both full names and codes regardless of case
 * 
 * @param language Language identifier (name or code)
 * @returns Normalized ISO 639 language code
 */
export function normalizeLanguageCode(language: string): string {
    const normalized = language.trim().toLowerCase();

    // If it's already a valid language code, return it
    if (LANGUAGE_NAME_MAP[normalized]) {
        return normalized;
    }

    // Otherwise try to map from language name to code
    return LANGUAGE_CODE_MAP[normalized] || normalized;
}

/**
 * Gets the full language name for a given language code
 * 
 * @param code ISO 639 language code
 * @returns Full language name
 */
export function getLanguageName(code: string): string {
    const normalized = normalizeLanguageCode(code);
    return LANGUAGE_NAME_MAP[normalized] || code;
}

/**
 * Checks if a language code belongs to the Indic languages group
 * 
 * @param code Language code to check
 * @returns True if the language is an Indic language
 */
export function isIndicLanguage(code: string): boolean {
    const normalized = normalizeLanguageCode(code);
    return INDIC_LANGUAGE_CODES.includes(normalized);
}

/**
 * Checks if a language code belongs to the European languages group
 * 
 * @param code Language code to check
 * @returns True if the language is a European language
 */
export function isEuropeanLanguage(code: string): boolean {
    const normalized = normalizeLanguageCode(code);
    return EUROPEAN_LANGUAGE_CODES.includes(normalized);
}

/**
 * Checks if a language code belongs to the East Asian languages group
 * 
 * @param code Language code to check
 * @returns True if the language is an East Asian language
 */
export function isEastAsianLanguage(code: string): boolean {
    const normalized = normalizeLanguageCode(code);
    return EAST_ASIAN_LANGUAGE_CODES.includes(normalized);
}

/**
 * Checks if a language code belongs to the African languages group
 * 
 * @param code Language code to check
 * @returns True if the language is an African language
 */
export function isAfricanLanguage(code: string): boolean {
    const normalized = normalizeLanguageCode(code);
    return AFRICAN_LANGUAGE_CODES.includes(normalized);
}

/**
 * Groups languages by their script systems
 * @returns Object mapping script types to arrays of language codes
 */
export function getLanguagesByScript(): Record<string, string[]> {
    return {
        'latin': ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'cs', 'hu', 'sv', 'da', 'fi', 'ro', 'no', 'hr', 'sk', 'sl', 'lt', 'lv', 'et', 'sq', 'eu', 'ca', 'gl', 'vi', 'tr', 'az', 'id', 'ms', 'sw', 'tl', 'af', 'zu', 'xh', 'eo'],
        'cyrillic': ['ru', 'uk', 'bg', 'be', 'mk', 'sr', 'ky', 'kk', 'tg', 'mn'],
        'devanagari': ['hi', 'sa', 'ne', 'mai', 'bho', 'mag', 'hne', 'raj', 'gbm', 'kfy'],
        'arabic': ['ar', 'fa', 'ur', 'sd', 'ps', 'ku'],
        'cjk': ['zh', 'ja', 'ko'],
        'south_indian': ['te', 'ta', 'kn', 'ml'],
        'other_indic': ['bn', 'pa', 'gu', 'or', 'as', 'kok', 'mni', 'syl'],
        'other_scripts': ['he', 'el', 'th', 'km', 'my', 'lo', 'am', 'ti', 'si', 'dv', 'bo']
    };
}

/**
 * Utility function to detect the domain of a text
 * 
 * @param text Input text to analyze
 * @returns Detected domain
 */
export function detectDomain(text: string): string {
    const text_lower = text.toLowerCase();

    // News domain detection
    if (text_lower.includes('news') ||
        text_lower.includes('report') ||
        text_lower.includes('journalist') ||
        text_lower.includes('media') ||
        text_lower.includes('today') ||
        text_lower.includes('headlines')) {
        return 'news';
    }

    // Scientific/technical domain detection
    if (text_lower.includes('research') ||
        text_lower.includes('study') ||
        text_lower.includes('scientific') ||
        text_lower.includes('data') ||
        text_lower.includes('analysis') ||
        text_lower.includes('technology')) {
        return 'scientific';
    }

    // Legal domain detection
    if (text_lower.includes('law') ||
        text_lower.includes('legal') ||
        text_lower.includes('court') ||
        text_lower.includes('rights') ||
        text_lower.includes('justice') ||
        text_lower.includes('constitution')) {
        return 'legal';
    }

    // Medical domain detection
    if (text_lower.includes('health') ||
        text_lower.includes('medical') ||
        text_lower.includes('doctor') ||
        text_lower.includes('patient') ||
        text_lower.includes('disease') ||
        text_lower.includes('treatment')) {
        return 'medical';
    }

    // Educational domain detection
    if (text_lower.includes('education') ||
        text_lower.includes('school') ||
        text_lower.includes('student') ||
        text_lower.includes('learn') ||
        text_lower.includes('teacher') ||
        text_lower.includes('knowledge')) {
        return 'educational';
    }

    // Default to general domain
    return 'general';
}

/**
 * Generate language pairs for translation datasets
 * @param languages Array of language codes
 * @returns Array of language pairs
 */
export function generateLanguagePairs(languages: string[]): Array<{ source: string, target: string }> {
    const pairs: Array<{ source: string, target: string }> = [];
    const normalizedLanguages = languages.map(lang => normalizeLanguageCode(lang));

    // Always include English as a source/target for better coverage
    const hasEnglish = normalizedLanguages.includes('en');
    if (!hasEnglish) {
        normalizedLanguages.push('en');
    }

    // Generate pairs between English and each language
    normalizedLanguages.forEach(lang => {
        if (lang !== 'en') {
            pairs.push({ source: 'en', target: lang });
            pairs.push({ source: lang, target: 'en' });
        }
    });

    // Generate pairs between other languages for better coverage
    for (let i = 0; i < normalizedLanguages.length; i++) {
        for (let j = i + 1; j < normalizedLanguages.length; j++) {
            if (normalizedLanguages[i] !== 'en' && normalizedLanguages[j] !== 'en') {
                pairs.push({ source: normalizedLanguages[i], target: normalizedLanguages[j] });
                pairs.push({ source: normalizedLanguages[j], target: normalizedLanguages[i] });
            }
        }
    }

    return pairs;
}

/**
 * Gets low-resource languages that might need special focus for dataset creation
 * @returns Array of ISO codes for low-resource languages
 */
export function getLowResourceLanguages(): string[] {
    return [
        // African low-resource languages
        'rw', 'lg', 'wo', 'sn', 'st', 'tn', 'ti', 'ts',

        // Indic low-resource languages
        'kok', 'mni', 'brx', 'doi', 'sat', 'tcy', 'gbm', 'kfy', 'lbj', 'lep',

        // Other low-resource languages
        'iu', 'nah', 'nv', 'chr', 'haw', 'sm', 'fj', 'ty', 'to',
        'jbo', 'gn', 'qu', 'bo', 'dv'
    ];
}