export default function Typography({
  variant = "body1",
  color = "inherit",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body1" | "body2";
  color?: "inherit" | "primary" | "secondary" | "success" | "error" | "warning" | "info";
}) {
  const className = `text-${variant} text-${color}`;
  return (
    <p className={className} {...props}>
      {props.children}
    </p>
  );
}
