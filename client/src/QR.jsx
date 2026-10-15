import qrcode from "qrcode-generator";
import { useMemo } from "react";

export default function QR({ text, cell = 6, label }) {
  const svg = useMemo(() => {
    const q = qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
  }, [text, cell]);
  return <div role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}
