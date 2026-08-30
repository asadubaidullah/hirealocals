import BrandLoader from "@/components/BrandLoader";

export default function Loading() {
  return (
    <div className="page-loading-shell">
      <BrandLoader
        label="Loading HireALocals"
        delayMs={180}
      />
    </div>
  );
}
