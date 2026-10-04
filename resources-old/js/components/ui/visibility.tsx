export default function Visibility(props: {
  children: React.ReactNode;
  visible: boolean;
}) {
  return <>{props.visible ? props.children : null}</>;
}
