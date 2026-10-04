
export default function Center(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="flex justify-center items-center h-screen flex-col gap-2"
      {...props}
    >
      {props.children}
    </div>
  );
}
