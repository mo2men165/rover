import { notFound } from "next/navigation";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { companies, campaignServices } from "@/lib/mock-data";

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

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = companies.find((c) => c.slug === slug);
  if (!company) notFound();

  const services = campaignServices.filter((cs) => cs.companySlug === slug);
  const totalSeats = services.reduce((sum, s) => sum + s.seats, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-muted">
          Client
        </p>
        <h1 className="font-heading text-2xl text-ink">{company.name}</h1>
        {company.contact && (
          <p className="mt-1 text-sm text-ink-muted">
            Primary contact: {company.contact}
          </p>
        )}
        <p className="mt-3 text-sm text-ink-muted">
          {services.length} campaign services ·{" "}
          <span className="tabular">{totalSeats}</span> total seats
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
          Campaign services
        </h2>
        <div className="border border-border bg-surface-raised">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Rate Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((cs, i) => (
                <TableRow
                  key={cs.id}
                  className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                >
                  <TableCell className="font-medium text-ink">
                    {cs.campaignName}
                  </TableCell>
                  <TableCell>
                    <TypeIndicator type={cs.type} />
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {cs.seats}
                  </TableCell>
                  <TableCell>{cs.serviceType}</TableCell>
                  <TableCell>{cs.rateType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
          Data list history
        </h2>
        <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface-raised py-16 text-center">
          <p className="text-sm font-medium text-ink">No data lists yet</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Data list uploads for this client&apos;s campaigns will appear
            here once available.
          </p>
        </div>
      </section>
    </div>
  );
}
