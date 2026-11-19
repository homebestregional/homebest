// What each social channel actually allows.
//
// Shared by the Accounts page, the composer previews and the publishing worker,
// so a platform rule is written once. Three of the five channels cannot be
// fully automated — that is a fact about their APIs, not a gap in this build.
//
// No server imports in this file: client pages read it too.

export const PLATFORMS = {
  instagram: {
    key: 'instagram',
    label: 'Instagram',
    icon: '📷',
    connector: 'meta',
    autoPublish: true,
    cap: '100 posts a day',
    needs: 'a photo or a video',
    captionLimit: 2200,
    supportsFirstComment: true,
    note: 'Posts on its own. Needs a Business account joined to the Facebook Page.',
  },
  facebook: {
    key: 'facebook',
    label: 'Facebook Page',
    icon: '👍',
    connector: 'meta',
    autoPublish: true,
    cap: '25 posts a day',
    needs: 'a photo or a video',
    captionLimit: 63206,
    supportsFirstComment: true,
    note: 'Posts on its own, using the Page token from the same Meta app.',
  },
  tiktok: {
    key: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    connector: 'tiktok',
    autoPublish: false,
    cap: 'about 15 posts a day',
    needs: 'a video',
    captionLimit: 2200,
    supportsFirstComment: false,
    note: 'The video is sent to your TikTok drafts. Someone opens the app and taps post. It can post on its own once TikTok approves our app.',
  },
  youtube: {
    key: 'youtube',
    label: 'YouTube Shorts',
    icon: '▶️',
    connector: 'google',
    autoPublish: true,
    cap: 'about 100 a day',
    needs: 'a tall video under 3 minutes',
    captionLimit: 5000,
    supportsFirstComment: false,
    note: 'Posts on its own. Videos stay unlisted until Google checks the app.',
  },
  whatsapp: {
    key: 'whatsapp',
    label: 'WhatsApp Channel',
    icon: '💬',
    connector: null,
    autoPublish: false,
    manualOnly: true,
    cap: '—',
    needs: 'anything',
    captionLimit: 4096,
    supportsFirstComment: false,
    note: 'WhatsApp has no tool for this. At the right time you get an email with the words and the picture, ready to post by hand.',
  },
}

export const PLATFORM_ORDER = ['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp']

export function platformMeta(key) {
  return (
    PLATFORMS[key] || {
      key: key,
      label: key,
      icon: '🔗',
      connector: null,
      autoPublish: false,
      cap: '—',
      note: '',
    }
  )
}

// Which platforms one sign-in brings in. Signing in to Meta once can return
// both a Facebook Page and the Instagram account joined to it.
export const CONNECTORS = {
  meta: { label: 'Instagram and Facebook', brings: ['instagram', 'facebook'], ready: true },
  tiktok: { label: 'TikTok', brings: ['tiktok'], ready: false },
  google: { label: 'YouTube', brings: ['youtube'], ready: false },
}

// Status words staff see, mapped onto the badge classes already in admin.css.
export const STATUS_BADGE = {
  active: { badge: 'badge-paid', label: 'Connected' },
  needs_reconnect: { badge: 'badge-failed', label: 'Sign in again' },
  manual_only: { badge: 'badge-pending', label: 'By hand' },
}
