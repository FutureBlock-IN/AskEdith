import { 
  Home, 
  HeartHandshake, 
  Landmark, 
  Scale, 
  DollarSign, 
  Activity, 
  Shield, 
  Users,
  Stethoscope,
  Building2
} from "lucide-react";

export const categoryIcons: Record<string, any> = {
  "senior-living": Home,
  "home-care": HeartHandshake,
  "government-resources": Landmark,
  "legal-attorneys": Scale,
  "paying-for-care": DollarSign,
  "physical-therapy": Activity,
  "va-benefits": Shield,
  "other-professionals": Users,
  "healthcare": Stethoscope,
  "housing": Building2,
};

export const categoryColors: Record<string, string> = {
  "senior-living": "rose",
  "home-care": "blue",
  "government-resources": "emerald",
  "legal-attorneys": "amber",
  "paying-for-care": "green",
  "physical-therapy": "cyan",
  "va-benefits": "teal",
  "other-professionals": "indigo",
  "healthcare": "purple",
  "housing": "orange",
};

export const categoryDescriptions: Record<string, string> = {
  "senior-living": "Assisted living, memory care, and housing decisions for aging parents.",
  "home-care": "In-home caregiving, daily routines, and managing care at home.",
  "government-resources": "Medicare, Medicaid, benefits, and navigating government programs.",
  "legal-attorneys": "Legal planning, estate matters, and working with attorneys.",
  "paying-for-care": "Financial planning, insurance, and affording quality care options.",
  "physical-therapy": "Rehabilitation, mobility, and physical therapy resources.",
  "va-benefits": "Veterans Affairs benefits and resources for military families.",
  "other-professionals": "Healthcare specialists, social workers, and other professional services.",
  "healthcare": "Medical care, doctor visits, and healthcare coordination.",
  "housing": "Housing modifications, accessibility, and living arrangements.",
};

export function getCategoryGradientClass(slug: string): string {
  const color = categoryColors[slug] || "gray";
  return `gradient-${color}`;
}

export function getCategoryBackgroundClass(slug: string): string {
  const color = categoryColors[slug] || "gray";
  return `bg-${color}`;
}

export function getCategoryIcon(slug: string) {
  return categoryIcons[slug] || Users;
}

export function getCategoryDescription(slug: string): string {
  return categoryDescriptions[slug] || "Community discussions and support.";
}
