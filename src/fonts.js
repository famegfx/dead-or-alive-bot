// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UNICODE FONT UTILITY
// Converts plain text → 𝖲𝖺𝗇𝗌 and 𝗕𝗼𝗹𝗱 𝗦𝗮𝗻𝘀 unicode
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SANS_UPPER = '𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹';
const SANS_LOWER = '𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓';

const BOLD_UPPER = '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭';
const BOLD_LOWER = '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇';
const BOLD_NUMS  = '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵';

/**
 * Convert text to Unicode Sans (𝖲𝖺𝗇𝗌)
 */
function sans(text) {
  return String(text).split('').map(c => {
    const upper = c.charCodeAt(0) - 65;
    const lower = c.charCodeAt(0) - 97;
    if (upper >= 0 && upper < 26) return [...SANS_UPPER][upper];
    if (lower >= 0 && lower < 26) return [...SANS_LOWER][lower];
    return c;
  }).join('');
}

/**
 * Convert text to Unicode Bold Sans (𝗦𝗮𝗻𝘀)
 */
function bold(text) {
  return String(text).split('').map(c => {
    const upper = c.charCodeAt(0) - 65;
    const lower = c.charCodeAt(0) - 97;
    const num   = c.charCodeAt(0) - 48;
    if (upper >= 0 && upper < 26) return [...BOLD_UPPER][upper];
    if (lower >= 0 && lower < 26) return [...BOLD_LOWER][lower];
    if (num   >= 0 && num   < 10) return [...BOLD_NUMS][num];
    return c;
  }).join('');
}

/**
 * Divider line
 */
const LINE  = '━━━━━━━━━━━━━━━━━━━━';
const LINE2 = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

module.exports = { sans, bold, LINE, LINE2 };
      
