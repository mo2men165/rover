import Link from "next/link";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { campaignServices, companies } from "@/lib/mock-data";

function TypeIndicator({ type }: { type: "Cold Calling" | "Texting" }) {
  const isCold = type === "Cold Calling";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${isCold ? "text-ledger" : "text-clay"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isCold ? "bg-ledger" : "bg-clay"}`}
      />
      {type}
    </span>
  );
}

export default function ClientsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl text-ink">Clients</h1>
        <p className="text-sm text-ink-muted">
          {campaignServices.length} active campaign services
        </p>
      </div>

      <div className="border border-border bg-surface-raised">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Seats</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Rate Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignServices.map((cs, i) => {
              const company = companies.find((c) => c.slug === cs.companySlug)!;
              return (
                <TableRow
                  key={cs.id}
                  className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                >
                  <TableCell>
                    <Link
                      href={`/clients/${company.slug}`}
                      className="font-medium text-ledger hover:underline"
                    >
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell>{cs.campaignName}</TableCell>
                  <TableCell>
                    <TypeIndicator type={cs.type} />
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {cs.seats}
                  </TableCell>
                  <TableCell>{cs.serviceType}</TableCell>
                  <TableCell>{cs.rateType}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
