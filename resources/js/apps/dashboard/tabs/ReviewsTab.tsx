import PageHeader from "@/components/PageHeader";
import ReviewsList from "@/components/ReviewsList";

export default function ReviewsTab() {
  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title="Reviews"
        description="User ratings and feedback across all applications."
      />

      <ReviewsList showApp />
    </div>
  );
}
