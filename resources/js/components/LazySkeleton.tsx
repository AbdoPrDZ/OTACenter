import React from "react";
import { Skeleton } from "./ui/skeleton";

export type LazySkeletonType =
  | "input"
  | "image"
  | "text"
  | "title"
  | "card"
  | "avatar"
  | "table"
  | "list";

export interface LazySkeletonProps {
  /**
   * Whether the skeleton is in a loading state.
   */
  loading: boolean;

  /**
   * The type of skeleton to render.
   */
  type?: LazySkeletonType;

  /**
   * The width of the skeleton.
   */
  width?: string | number;

  /**
   * The height of the skeleton.
   */
  height?: string | number;

  /**
   * The border radius for the skeleton.
   */
  borderRadius?: string | number;

  /**
   * The children to render when not in a loading state.
   */
  children?: React.ReactNode;
}

function toCssValue(value?: string | number) {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

interface SkeletonShapeProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

function SkeletonShape({
  width,
  height,
  borderRadius,
}: SkeletonShapeProps) {
  return (
    <Skeleton
      style={{
        width: toCssValue(width),
        height: toCssValue(height),
        borderRadius: toCssValue(borderRadius),
      }}
    />
  );
}

function InputSkeleton(props: SkeletonShapeProps) {
  return (
    <SkeletonShape
      width={props.width ?? "100%"}
      height={props.height ?? 40}
      borderRadius={props.borderRadius ?? 6}
    />
  );
}

function ImageSkeleton(props: SkeletonShapeProps) {
  return (
    <SkeletonShape
      width={props.width ?? "100%"}
      height={props.height ?? 200}
      borderRadius={props.borderRadius ?? 8}
    />
  );
}

function TextSkeleton(props: SkeletonShapeProps) {
  return (
    <SkeletonShape
      width={props.width ?? "100%"}
      height={props.height ?? 16}
      borderRadius={props.borderRadius ?? 4}
    />
  );
}

function TitleSkeleton(props: SkeletonShapeProps) {
  return (
    <SkeletonShape
      width={props.width ?? "60%"}
      height={props.height ?? 24}
      borderRadius={props.borderRadius ?? 4}
    />
  );
}

function AvatarSkeleton(props: SkeletonShapeProps) {
  return (
    <SkeletonShape
      width={props.width ?? 40}
      height={props.height ?? 40}
      borderRadius={props.borderRadius ?? "50%"}
    />
  );
}

function CardSkeleton(props: SkeletonShapeProps) {
  return (
    <div
      className="w-full space-y-4 rounded-lg border p-4"
      style={{
        width: toCssValue(props.width),
        height: toCssValue(props.height),
      }}
    >
      <Skeleton
        className="w-full"
        style={{
          height: 160,
          borderRadius: toCssValue(props.borderRadius ?? 8),
        }}
      />

      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}

function ListSkeleton(props: SkeletonShapeProps) {
  const count = 4;

  return (
    <div
      className="w-full space-y-4"
      style={{
        width: toCssValue(props.width),
        height: toCssValue(props.height),
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />

          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton(props: SkeletonShapeProps) {
  const rows = 5;
  const columns = 4;

  return (
    <div
      className="w-full overflow-hidden rounded-md border"
      style={{
        width: toCssValue(props.width),
        height: toCssValue(props.height),
        borderRadius: toCssValue(props.borderRadius),
      }}
    >
      {/* Header */}
      <div className="flex gap-4 border-b p-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-4 flex-1 rounded"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 border-b p-4 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className="h-4 flex-1 rounded"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LazySkeleton({
  loading,
  type = "text",
  width,
  height,
  borderRadius,
  children,
}: LazySkeletonProps) {
  if (!loading) {
    return <>{children}</>;
  }

  const props = {
    width,
    height,
    borderRadius,
  };

  switch (type) {
    case "input":
      return <InputSkeleton {...props} />;

    case "image":
      return <ImageSkeleton {...props} />;

    case "text":
      return <TextSkeleton {...props} />;

    case "title":
      return <TitleSkeleton {...props} />;

    case "avatar":
      return <AvatarSkeleton {...props} />;

    case "card":
      return <CardSkeleton {...props} />;

    case "table":
      return <TableSkeleton {...props} />;

    case "list":
      return <ListSkeleton {...props} />;

    default:
      return <TextSkeleton {...props} />;
  }
}
