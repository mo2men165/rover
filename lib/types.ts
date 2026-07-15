export type CampaignType = "Cold Calling" | "Texting";
export type ServiceType = "Dedicated" | "Shared";
export type RateType = "Per Seat" | "Hourly" | "Per Lead" | "Flat Rate";

export type CampaignService = {
  id: string;
  companySlug: string;
  campaignName: string;
  type: CampaignType;
  seats: number;
  serviceType: ServiceType;
  rateType: RateType;
};

export type Company = {
  slug: string;
  name: string;
  contact?: string;
};
