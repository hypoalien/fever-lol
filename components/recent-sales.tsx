import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePrice } from "@/hooks/use-price";
interface RecentSalesProps {
  sales: {
    id: string;
    name: string;
    email: string;
    amountMinor: number;
    date: string;
  }[];
}

export function RecentSales({ sales }: RecentSalesProps) {
  const { currency } = usePrice();

  return (
    <div className="space-y-8">
      {sales.map((sale) => (
        <div key={sale.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {sale.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.name}</p>
            <p className="text-sm text-muted-foreground">{sale.email}</p>
          </div>
          <div className="ml-auto font-medium">
            +{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(sale.amountMinor / 100)}
          </div>
        </div>
      ))}
    </div>
  );
}
