import { AdminBillingOptions } from "@/components/admin-billing-options";
import { getProPlansAction } from "@/lib/actions/billing-options";

export default async function AdminPricingPage() {
  return <AdminBillingOptions kind="pro" plans={await getProPlansAction()} />;
}
