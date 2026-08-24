import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { navigate } from "./navigation";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children?: ReactNode };
export default function Link({ href, children, ...props }: Props) {
  const { onClick, ...anchorProps } = props;
  function open(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchorProps.target === "_blank" || anchorProps.download) return;
    const next = new URL(href, location.href);
    if (next.origin !== location.origin) return;
    event.preventDefault();
    navigate(next.href);
  }
  return <a href={href} onClick={open} {...anchorProps}>{children}</a>;
}
