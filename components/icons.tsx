export function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M13.5 3.5 16 6l-8.5 8.5H5v-2.5z" />
    </svg>
  );
}

export function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M5 6h10M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
    </svg>
  );
}

export function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 10.5 10 5l6 5.5M6 9v6h8V9" />
    </svg>
  );
}

export function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M3 6.5a1 1 0 0 1 1-1h3.3l1.4 1.8H16a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function GearIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2" />
    </svg>
  );
}
