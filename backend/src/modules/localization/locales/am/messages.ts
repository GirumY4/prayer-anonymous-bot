import type { TranslationKey } from '../../translation-keys.js';

export const amMessages: Record<TranslationKey, string> = {
  // Welcome & Language
  'welcome.title': '🙏 እንኳን ወደ ስም-አልባ የጸሎት ጥያቄ ቦት በሰላም መጡ!',
  'language.choose': 'እባክዎ የሚመርጡትን ቋንቋ ይምረጡ።',
  'language.amharic': '🇪🇹 አማርኛ',
  'language.english': '🇬🇧 English',

  // Privacy
  'privacy.title': '🔒 የግላዊነት ማሳወቂያ',
  'privacy.notice':
    'ይህ ቦት የጸሎት ጉዳይዎን ለህብረቱ የጸሎት ቡድን ማንነትዎን ሳይገልጹ ለመላክ ያስችልዎታል። ሲስተሙ የቴሌግራም መለያዎን ከጸሎት ጉዳይዎ ጋር አያያይዞ አያስቀምጥም። እባክዎ በጸሎትዎ ውስጥ ስምዎን፣ ስልክ ቁጥርዎን ወይም ማንነትዎን ሊገልጹ የሚችሉ ዝርዝሮችን አይጨምሩ። ይህ ለአደጋ ጊዜ ምላሽ የሚሰጥ አገልግሎት አይደለም።',
  'privacy.acknowledge': '✅ ተረድቻለሁ',
  'privacy.details': '🔒 ተጨማሪ የግላዊነት መረጃ',

  // Menu
  'menu.title': '🙏 ዋና ምናሌ\nምን ማድረግ ይፈልጋሉ?',
  'menu.submit': '🙏 የጸሎት ጉዳይ ላክ',
  'menu.change_language': '🌐 ቋንቋ ቀይር',
  'menu.privacy': '🔒 የግላዊነት መረጃ',
  'menu.help': 'ℹ️ እገዛ',

  // Submission
  'submission.instructions':
    '🙏 እባክዎ የጸሎት ቡድኑ እንዲጸልይልዎት የሚፈልጉትን የጸሎት ጉዳይ ይጻፉ።\n\nበጣም የግል የሆነ ጉዳይ ሊሆን ይችላል። ለግላዊነትዎ ሲባል እባክዎ የሚከተሉትን አይጨምሩ፡\n• ስምዎን\n• የቴሌግራም መለያዎን\n• ስልክ ቁጥርዎን\n• የተማሪ መለያ ቁጥርዎን\n• እርስዎን በቀላሉ ሊለይ የሚችል ዝርዝር\n\nእባክዎ የጸሎት ጉዳይዎን በጽሁፍ መልዕክት ይላኩ።',
  'submission.cancel': '❌ ሰርዝ',

  // Review
  'review.title': '🙏 እባክዎ የጸሎት ጉዳይዎን ይመልከቱ:',
  'review.warning': 'ስምዎን ወይም ማንነትዎን ሊገልጽ የሚችል ሌላ መረጃ አለመጨመርዎን እባክዎ ያረጋግጡ።',
  'review.submit': '✅ በስም-አልባነት ላክ',
  'review.edit': '✏️ አስተካክል',
  'review.cancel': '❌ ሰርዝ',

  // Confirmation
  'confirmation.success':
    '🙏 የጸሎት ጉዳይዎ በተሳካ ሁኔታ ተቀብሏል።\n\nበሚቀጥለው ሳምንታዊ የጸሎት ጉባኤ ለጸሎት ቡድኑ በማንነትዎ ሳይገለጽ ይደርሳል።',
  'confirmation.request_id': 'የጥያቄ መለያ:',

  // Errors
  'error.empty_request': '⚠️ የጸሎት ጉዳይዎ ባዶ ነው። እባክዎ ጽፈው እንደገና ይላኩ።',
  'error.too_long': '⚠️ የጸሎት ጉዳይዎ በጣም ረጅም ነው። እባክዎ አሳጥረው እንደገና ይሞክሩ።',
  'error.unsupported_media': '⚠️ እባክዎ የጸሎት ጉዳይዎን በጽሁፍ ይላኩ። ምስሎች፣ የድምጽ መልዕክቶች እና ፋይሎች አይደገፉም።',
  'error.general': '⚠️ የሆነ ስህተት ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።',
  'error.session_expired':
    '⚠️ ለግላዊነትዎ ሲባል የእርስዎ ክፍለ-ጊዜ (session) ጊዜው አልፏል። እባክዎ /start በመጠቀም እንደገና ይጀምሩ።',
  'error.invalid_callback': '⚠️ ይህ ተግባር አሁን ላይ ህጋዊ አይደለም። እባክዎ የአሁኑን ምናሌ ይጠቀሙ።',

  // Help & Safety
  'help.title': 'ℹ️ እገዛ',
  'help.content':
    "ይህ ቦት ለህብረቱ የጸሎት ቡድን ስም-አልባ የጸሎት ጥያቄዎችን ይሰበስባል።\n\n1. 'የጸሎት ጉዳይ ላክ' የሚለውን ይጫኑ።\n2. ጸሎትዎን ይጻፉ (ስምዎን አይጨምሩ)።\n3. ከለሱ እና ያስገቡ (Submit)።\n4. ጥያቄዎ በሳምንታዊ ጸሎት በስም-አልባነት ይላካል።\n\nትዕዛዞች:\n/cancel - ረቂቁን ሰርዝ\n/language - ቋንቋ ቀይር\n/privacy - የግላዊነት መረጃን ይመልከቱ",
  'safety.warning':
    '⚠️ ማሳሰቢያ: ይህ ቦት ለጸሎት ጥያቄዎች ብቻ ነው። ለአደጋ ጊዜ ወይም ለቀውስ ምላሽ የሚሰጥ አገልግሎት አይደለም። እርስዎ ወይም ሌላ ሰው በአስቸኳይ አደጋ ላይ ከሆነ፣ እባክዎ የሚያምኑትን ሰው ወይም ተገቢውን የአደጋ ጊዜ/እገዛ አገልግሎት በቀጥታ ያነጋግሩ።',

  // Cancellation & Commands
  'cancellation.success': '❌ የአሁኑ የጸሎት ጉዳይ ረቂቅዎ ተሰርዟል። ምንም የጸሎት ጉዳይ አልተላከም።',
  'command.unknown': 'ይህን ትዕዛዝ አላውቀውም። ያሉትን አማራጮች ለማየት /help ይጠቀሙ።',
};
