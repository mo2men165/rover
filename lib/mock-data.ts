import type { Company, CampaignService } from "@/lib/types";

export const companies: Company[] = [
  { slug: "brad-young", name: "Brad Young" },
  { slug: "sos-homebuyers", name: "SOS Homebuyers", contact: "Vance Courtney" },
];

export const campaignServices: CampaignService[] = [
  {
    id: "1",
    companySlug: "brad-young",
    campaignName: "Young",
    type: "Cold Calling",
    seats: 4,
    serviceType: "Dedicated",
    rateType: "Per Seat",
  },
  {
    id: "2",
    companySlug: "brad-young",
    campaignName: "Younger",
    type: "Cold Calling",
    seats: 3,
    serviceType: "Dedicated",
    rateType: "Per Seat",
  },
  {
    id: "3",
    companySlug: "brad-young",
    campaignName: "Youngest",
    type: "Cold Calling",
    seats: 2,
    serviceType: "Shared",
    rateType: "Hourly",
  },
  {
    id: "4",
    companySlug: "sos-homebuyers",
    campaignName: "Vanco",
    type: "Cold Calling",
    seats: 5,
    serviceType: "Dedicated",
    rateType: "Per Seat",
  },
  {
    id: "5",
    companySlug: "sos-homebuyers",
    campaignName: "SOS Homebuyers",
    type: "Texting",
    seats: 2,
    serviceType: "Shared",
    rateType: "Per Lead",
  },
];
