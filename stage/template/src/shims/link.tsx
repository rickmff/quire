import * as React from "react";
const Link = React.forwardRef<HTMLAnchorElement, any>(
  ({ href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, ...rest }, ref) => (
    <a ref={ref} href={typeof href === "string" ? href : "#"} onClick={(e) => e.preventDefault()} {...rest} />
  ),
);
export default Link;
