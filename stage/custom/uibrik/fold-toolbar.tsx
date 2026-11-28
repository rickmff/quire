import { IconCircle, IconPencil, IconSquare, IconTriangle, IconTypography } from "@tabler/icons-react";
import { FoldToolbar } from "@/@components/uibrik/fold-toolbar/fold-toolbar";

const tools = [
  { value: "square", label: "Rectangle", icon: <IconSquare stroke={1.75} /> },
  { value: "circle", label: "Ellipse", icon: <IconCircle stroke={1.75} /> },
  { value: "triangle", label: "Triangle", icon: <IconTriangle stroke={1.75} /> },
  { value: "pen", label: "Pen", icon: <IconPencil stroke={1.75} /> },
  { value: "text", label: "Text", icon: <IconTypography stroke={1.75} /> },
];

export default function FoldToolbarDemo() {
  return <FoldToolbar tools={tools} label="Shapes" />;
}
