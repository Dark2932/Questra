import { Link } from 'react-router-dom';
import { Typography } from 'antd';
import {
  DEFAULT_FOOTER_COPYRIGHT,
  footerCopyrightParts,
  programFooterPreset,
} from '../lib/footer';

const { Text } = Typography;
const QUESTRA_REPOSITORY = 'https://github.com/Dark2932/Questra';

function SiteLink({ siteName }) {
  return <Link to="/">{siteName || 'Questra'}</Link>;
}

function CopyrightText({ template, siteName }) {
  if (!template?.trim()) return null;
  if (template.trim() === DEFAULT_FOOTER_COPYRIGHT) {
    return <><strong>Copyright © {new Date().getFullYear()} <SiteLink siteName={siteName} />.</strong> All rights reserved.</>;
  }

  return footerCopyrightParts(template).map((part, index) => part.type === 'site'
    ? <SiteLink key={`${part.type}-${index}`} siteName={siteName} />
    : <span key={`${part.type}-${index}`}>{part.value}</span>);
}

export default function SiteFooter({ site = {}, className = '' }) {
  const program = programFooterPreset(site.footerProgram);
  return <footer className={`site-footer ${className}`.trim()}>
    <Text type="secondary" className="site-footer-copyright"><CopyrightText template={site.footerCopyright} siteName={site.siteName} /></Text>
    <Text type="secondary" className="site-footer-program">
      {program.prefix}<a href={QUESTRA_REPOSITORY} target="_blank" rel="noreferrer">Questra</a>{program.suffix || ''}
    </Text>
  </footer>;
}
