import React, { useEffect, useRef } from "react";

import Jazzicon from "jazzicon";

import "./style.less";

export const Identicon = (props: {
  address?: string;
  style?: React.CSSProperties;
}) => {
  const { address, style } = props;
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (address && ref.current) {
      ref.current.innerHTML = "";
      ref.current.appendChild(
        Jazzicon(style?.width || 16, parseInt(address.slice(0, 10), 16))
      );
    }
  }, [address, style]);

  return (
    <div className="identicon-wrapper" ref={ref as any} style={props.style} />
  );
};
