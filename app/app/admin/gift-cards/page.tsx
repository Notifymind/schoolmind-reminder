import { AdminBillingOptions } from "@/components/admin-billing-options";
import { getGiftCardOptionsAction } from "@/lib/actions/billing-options";

export default async function AdminGiftCardsPage() {
  return (
    <AdminBillingOptions kind="gift" gifts={await getGiftCardOptionsAction()} />
  );
}
