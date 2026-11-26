"use client";

import dynamic from "next/dynamic";
import s from "./Landing.module.css";

const Quire3D = dynamic(() => import("./Quire3D"), {
  ssr: false,
  loading: () => <div className={s.stage} aria-hidden="true" />,
});

export default function Hero3D() {
  return <Quire3D />;
}
