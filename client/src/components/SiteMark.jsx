import { DEFAULT_SITE_ICON_URL } from '../lib/siteIcon';

function firstCharacter(value, fallback = 'Q') {
  return Array.from(String(value || '').trim() || fallback)[0] || fallback;
}

export default function SiteMark({
  siteName,
  siteInitial,
  siteInitialColor,
  siteIcon,
  siteIconAsInitial = false,
  size = 28,
  borderRadius = 8,
  fontSize = 13,
  className = '',
}) {
  const useIcon = Boolean(siteIconAsInitial);

  return <span
    className={`site-mark ${className}`.trim()}
    style={{
      width: size,
      height: size,
      borderRadius,
      background: useIcon ? 'transparent' : (siteInitialColor || 'var(--ant-color-primary)'),
      color: '#fff',
      display: 'inline-grid',
      placeItems: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      fontSize,
      fontWeight: 800,
      lineHeight: 1,
    }}
  >
    {useIcon
      ? <img src={siteIcon || DEFAULT_SITE_ICON_URL} alt="" />
      : firstCharacter(siteInitial, siteName || 'Questra')}
  </span>;
}
