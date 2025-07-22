import dynamic from "next/dynamic";

const Pdf = dynamic(() => import("./Component").then((mod) => mod.Pdf), {
  ssr: false,
});

export { Pdf };
