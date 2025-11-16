"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import type { Role } from "@/lib/auth/permissions";
import type { PersonRecord, RecordType } from "@/lib/types";
import { createLoadingToast, resolveToast } from "@/lib/toast-feedback";
import { DASHBOARD_ACCOUNT_EVENT, type DashboardAccountEventDetail } from "./account-event";

const formatTextValue = (value?: string | null) => {
  if (value === null || value === undefined) {
    return "—";
  }
  const trimmed = value.toString().trim();
  return trimmed.length > 0 ? trimmed : "—";
};

const formatUpperValue = (value?: string | null) => {
  const text = formatTextValue(value);
  return text === "—" ? text : text.toUpperCase();
};

type DashboardClientProps = {
  records: PersonRecord[];
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  currentUserRole: Role;
  currentUserRecordId: string | null;
};

type FormMode = "create" | "edit" | "view";

type TableColumn = {
  key: string;
  label: string;
  render: (record: PersonRecord) => ReactNode;
  cellClassName?: string;
};

type FilterOption<T extends string = string> = {
  label: string;
  value: T;
};

const ROLE_DISPLAY_ORDER = ["user", "editor", "admin", "superadmin"] satisfies Role[];
const ROLE_ASSIGNABLE = {
  superadmin: ["admin", "editor", "user"],
  admin: ["editor", "user"],
  editor: ["user"],
  user: [],
} satisfies Record<Role, Role[]>;
const PAGE_SIZE = 10;

type EngagementTier = "low" | "medium" | "high";
type CollaborationStatus = "prospect" | "contacted" | "warm_lead" | "active" | "paused" | "completed";

type FilterState = {
  recordTypes: RecordType[];
  engagementTiers: EngagementTier[];
  countries: string[];
  cities: string[];
  categories: string[];
  statuses: CollaborationStatus[];
};

const ENGAGEMENT_TIER_LABELS: Record<EngagementTier, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const STATUS_LABELS: Record<CollaborationStatus, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  warm_lead: "Warm lead",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const CATEGORY_OPTIONS = [
  "Beauty",
  "Lifestyle",
  "Tech",
  "Business",
  "Travel",
  "Food",
  "Finance",
];

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "X",
  "LINE",
  "WeChat",
];

const LANGUAGE_OPTIONS = ["TH", "EN", "CN"];

const OCCUPATION_OPTIONS = [
  "Content Creator",
  "Entrepreneur",
  "Marketing Specialist",
  "Public Figure",
  "Media Personality",
  "Consultant",
  "Performer",
  "Other",
];

const COUNTRY_CITY_MAP: Record<string, string[]> = {
  Thailand: [
    "Bangkok",
    "Chiang Mai",
    "Phuket",
    "Pattaya",
    "Khon Kaen",
    "Udon Thani",
    "Ayutthaya",
    "Nakhon Ratchasima",
  ],
  Vietnam: ["Hanoi", "Ho Chi Minh City", "Da Nang"],
  Singapore: ["Singapore"],
  Malaysia: ["Kuala Lumpur", "Penang"],
  Indonesia: ["Jakarta", "Bali"],
};

const TABLE_COLUMNS: TableColumn[] = [
  {
    key: "record_id",
    label: "ID",
    cellClassName: "font-semibold tracking-[0.4em] text-white",
    render: (record) => record.recordId,
  },
  {
    key: "record_type",
    label: "Type",
    cellClassName: "uppercase text-xs text-white/60",
    render: (record) => formatUpperValue(record.recordType),
  },
  {
    key: "full_name",
    label: "Name",
    render: (record) => formatTextValue(record.fullName),
  },
  {
    key: "tier",
    label: "Tier",
    cellClassName: "uppercase text-xs text-white/60",
    render: (record) => formatUpperValue(record.engagementRateTier),
  },
  {
    key: "city",
    label: "City",
    render: (record) => formatTextValue(record.city),
  },
  {
    key: "country",
    label: "Country",
    render: (record) => formatTextValue(record.country),
  },
  {
    key: "collaboration_status",
    label: "Status",
    cellClassName: "uppercase tracking-wide text-xs",
    render: (record) => formatUpperValue(record.collaborationStatus),
  },
  {
    key: "influencer_category",
    label: "Category",
    render: (record) => formatTextValue(record.influencerCategory),
  },
];

type FormState = {
  recordId: string | null;
  recordType: RecordType;
  fullName: string;
  preferredName: string;
  gender: string;
  birthDate: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  occupation: string;
  influencerCategory: string;
  primaryPlatform: string;
  secondaryPlatform: string;
  followersCount: string;
  secondaryFollowersCount: string;
  averageMonthlyReach: string;
  languages: string;
  interests: string;
  notes: string;
  collaborationStatus: string;
  portfolioUrl: string;
  lastContactDate: string;
  role: Role;
};

const createDefaultFormState = (): FormState => ({
  recordId: null,
  recordType: "individual",
  fullName: "",
  preferredName: "",
  gender: "Male",
  birthDate: "",
  email: "",
  phone: "",
  country: "Thailand",
  city: "Bangkok",
  occupation: "",
  influencerCategory: "",
  primaryPlatform: "",
  secondaryPlatform: "",
  followersCount: "",
  secondaryFollowersCount: "",
  averageMonthlyReach: "",
  languages: "TH",
  interests: "",
  notes: "",
  collaborationStatus: "active",
  portfolioUrl: "",
  lastContactDate: new Date().toISOString().slice(0, 10),
  role: "user",
});

function getInitialFormFromRecord(record: PersonRecord): FormState {
  return {
    recordId: record.recordId,
    recordType: record.recordType,
    fullName: record.fullName ?? "",
    preferredName: record.preferredName ?? record.fullName ?? "",
    gender: record.gender ?? "Other",
    birthDate: record.birthDate ?? "",
    email: record.email ?? "",
    phone: record.phone ?? "",
    country: record.country ?? "",
    city: record.city ?? "",
    occupation: record.occupation ?? "",
    influencerCategory: record.influencerCategory ?? "",
    primaryPlatform: record.primaryPlatform ?? "",
    secondaryPlatform: record.secondaryPlatform ?? "",
    followersCount:
      typeof record.followersCount === "number" ? record.followersCount.toString() : "",
    secondaryFollowersCount:
      typeof record.secondaryFollowersCount === "number"
        ? record.secondaryFollowersCount.toString()
        : "",
    averageMonthlyReach:
      typeof record.averageMonthlyReach === "number"
        ? record.averageMonthlyReach.toString()
        : "",
    languages: record.languages ?? "",
    interests: record.interests ?? "",
    notes: record.notes ?? "",
    collaborationStatus: record.collaborationStatus ?? "active",
    portfolioUrl: record.portfolioUrl ?? "",
    lastContactDate: record.lastContactDate ?? "",
    role: record.role,
  };
}

function normalizeLanguages(input: string) {
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(", ");
}

function parseDateOrUndefined(value?: string | null) {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

export function DashboardClient({
  records,
  permissions,
  currentUserRole,
  currentUserRecordId,
}: DashboardClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode | null>(null);

  const [formState, setFormState] = useState<FormState>(() => createDefaultFormState());
  const [selectedRecord, setSelectedRecord] = useState<PersonRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonRecord | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    recordTypes: [],
    engagementTiers: [],
    countries: [],
    cities: [],
    categories: [],
    statuses: [],
  });
  const [isPending, startTransition] = useTransition();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const totalInfluencers = useMemo(
    () => records.filter((record) => record.recordType === "influencer").length,
    [records]
  );

  const totalIndividuals = useMemo(
    () => records.filter((record) => record.recordType === "individual").length,
    [records]
  );

  const statCards = useMemo(
    () => [
      {
        label: "Total records",
        value: records.length.toLocaleString(),
      },
      {
        label: "Influencers",
        value: totalInfluencers.toLocaleString(),
      },
      {
        label: "Individuals",
        value: totalIndividuals.toLocaleString(),
      },
    ],
    [records.length, totalInfluencers, totalIndividuals]
  );

  const availableCities = useMemo<string[]>(() => {
    const selectedCountryCities = filters.countries.flatMap(
      (country) => COUNTRY_CITY_MAP[country as keyof typeof COUNTRY_CITY_MAP] ?? []
    );
    if (selectedCountryCities.length > 0) {
      return selectedCountryCities;
    }
    return Object.values(COUNTRY_CITY_MAP).flat();
  }, [filters.countries]);

  const activeFiltersCount = useMemo(
    () =>
      filters.recordTypes.length +
      filters.engagementTiers.length +
      filters.countries.length +
      filters.cities.length +
      filters.categories.length +
      filters.statuses.length,
    [filters]
  );

  const { totalFollowersDisplay, engagementRateDisplay, engagementTierDisplay } = useMemo(() => {
    const parseNumeric = (input: string) => {
      const trimmed = input?.trim();
      if (!trimmed) {
        return null;
      }
      const cleaned = trimmed.replace(/,/g, "");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const followers = parseNumeric(formState.followersCount);
    const secondary = parseNumeric(formState.secondaryFollowersCount);
    const reach = parseNumeric(formState.averageMonthlyReach);

    const hasPrimary = followers !== null;
    const hasSecondary = secondary !== null;
    const totalValue = hasPrimary || hasSecondary ? (followers ?? 0) + (secondary ?? 0) : null;

    let engagementRate: number | null = null;
    if (totalValue !== null && reach !== null && reach > 0) {
      engagementRate = totalValue / reach / 4;
    }

    let engagementTier: string | null = null;
    if (engagementRate !== null) {
      if (engagementRate > 0.07) {
        engagementTier = "High";
      } else if (engagementRate >= 0.05) {
        engagementTier = "Medium";
      } else if (engagementRate >= 0) {
        engagementTier = "Low";
      }
    }

    return {
      totalFollowersDisplay: totalValue !== null ? totalValue.toLocaleString() : "—",
      engagementRateDisplay: engagementRate !== null ? engagementRate.toFixed(4) : "—",
      engagementTierDisplay: engagementTier ?? "—",
    };
  }, [
    formState.followersCount,
    formState.secondaryFollowersCount,
    formState.averageMonthlyReach,
  ]);

  const toggleFilterValue = <K extends keyof FilterState>(key: K, value: FilterState[K][number]) => {
    setCurrentPage(1);
    setFilters((prev) => {
      const current = prev[key];
      const exists = current.includes(value as never);
      const nextValues = exists
        ? (current.filter((item) => item !== value) as FilterState[K])
        : ([...current, value] as FilterState[K]);
      return { ...prev, [key]: nextValues };
    });
  };

  const toggleCountry = (country: string) => {
    setCurrentPage(1);
    setFilters((prev) => {
      const exists = prev.countries.includes(country);
      const nextCountries = exists
        ? prev.countries.filter((entry) => entry !== country)
        : [...prev.countries, country];

      const validCities =
        nextCountries.length === 0
          ? prev.cities
          : prev.cities.filter((city) => {
              const owningCountries = Object.entries(COUNTRY_CITY_MAP)
                .filter(([, cities]) => cities.includes(city as never))
                .map(([countryName]) => countryName);
              return owningCountries.some((name) => nextCountries.includes(name));
            });

      return {
        ...prev,
        countries: nextCountries,
        cities: validCities,
      };
    });
  };

  const [currentPage, setCurrentPage] = useState(1);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.recordTypes.length > 0 && !filters.recordTypes.includes(record.recordType)) {
        return false;
      }

      if (
        filters.engagementTiers.length > 0 &&
        (!record.engagementRateTier ||
          !filters.engagementTiers.includes(record.engagementRateTier.toLowerCase() as EngagementTier))
      ) {
        return false;
      }

      if (
        filters.countries.length > 0 &&
        (!record.country || !filters.countries.includes(record.country))
      ) {
        return false;
      }

      if (filters.cities.length > 0 && (!record.city || !filters.cities.includes(record.city))) {
        return false;
      }

      if (
        filters.categories.length > 0 &&
        (!record.influencerCategory || !filters.categories.includes(record.influencerCategory))
      ) {
        return false;
      }

      if (
        filters.statuses.length > 0 &&
        (!record.collaborationStatus ||
          !filters.statuses.includes(record.collaborationStatus.toLowerCase() as CollaborationStatus))
      ) {
        return false;
      }

      return true;
    });
  }, [records, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const displayedRecords = useMemo(() => {
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRecords, safePage]);
  const paginationStart = filteredRecords.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const paginationEnd = filteredRecords.length === 0 ? 0 : Math.min(safePage * PAGE_SIZE, filteredRecords.length);
  const canGoPrevious = safePage > 1;
  const canGoNext = safePage < totalPages;
  const isReadOnlyMode = mode === "view";
  const roleOptionsForSelect = useMemo(() => {
    if (formState.role === "superadmin") {
      return ["superadmin"] as Role[];
    }
    const assignable = [...ROLE_ASSIGNABLE[currentUserRole]] as Role[];
    const allowed = new Set<Role>(assignable);
    allowed.add(formState.role);
    return ROLE_DISPLAY_ORDER.filter((roleOption) => allowed.has(roleOption));
  }, [currentUserRole, formState.role]);
  const roleSelectDisabled = isReadOnlyMode || roleOptionsForSelect.length <= 1;
  const resolvedRecordId = selectedRecord?.recordId ?? formState.recordId ?? "";
  const resolvedRecordLabel =
    resolvedRecordId.length > 0
      ? resolvedRecordId
      : formState.fullName.trim().length > 0
        ? formState.fullName
        : "record";
  const modalTitle =
    mode === "create"
      ? "Create person"
      : mode === "edit"
        ? `Edit ${resolvedRecordLabel}`
        : mode === "view"
          ? `View ${resolvedRecordLabel}`
          : "";
  const modalSubtitle =
    mode === "create"
      ? "Fill out the profile information to create a new record."
      : mode === "view"
        ? "Fields are locked until you choose Edit."
        : "";

  const recordTypeOptions = useMemo<FilterOption<RecordType>[]>(
    () => [
      { label: "Individual", value: "individual" },
      { label: "Influencer", value: "influencer" },
    ],
    []
  );

  const countryOptions = useMemo<FilterOption<string>[]>(
    () => Object.keys(COUNTRY_CITY_MAP).map((country) => ({ label: country, value: country })),
    []
  );

  const engagementOptions = useMemo<FilterOption<EngagementTier>[]>(
    () =>
      (Object.keys(ENGAGEMENT_TIER_LABELS) as EngagementTier[]).map((tier) => ({
        label: ENGAGEMENT_TIER_LABELS[tier],
        value: tier,
      })),
    []
  );

  const statusOptions = useMemo<FilterOption<CollaborationStatus>[]>(
    () =>
      (Object.keys(STATUS_LABELS) as CollaborationStatus[]).map((status) => ({
        label: STATUS_LABELS[status],
        value: status,
      })),
    []
  );

  const cityOptions = useMemo<FilterOption<string>[]>(
    () => Array.from(new Set(availableCities)).map((city) => ({ label: city, value: city })),
    [availableCities]
  );

  const categoryOptions = useMemo<FilterOption<string>[]>(
    () => CATEGORY_OPTIONS.map((category) => ({ label: category, value: category })),
    []
  );

  const selectedLanguages = useMemo(() => {
    return formState.languages
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }, [formState.languages]);

  const handleLanguageToggle = (language: string) => {
    setFormState((prev) => {
      const current = prev.languages
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      const exists = current.includes(language);
      const nextValues = exists ? current.filter((entry) => entry !== language) : [...current, language];
      return { ...prev, languages: normalizeLanguages(nextValues.join(",")) };
    });
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    setFilters({
      recordTypes: [],
      engagementTiers: [],
      countries: [],
      cities: [],
      categories: [],
      statuses: [],
    });
  };

  const handleRecordTypeToggle = (value: RecordType) => toggleFilterValue("recordTypes", value);
  const handleEngagementToggle = (value: EngagementTier) => toggleFilterValue("engagementTiers", value);
  const handleCityToggle = (value: string) => toggleFilterValue("cities", value);
  const handleCategoryToggle = (value: string) => toggleFilterValue("categories", value);
  const handleStatusToggle = (value: CollaborationStatus) => toggleFilterValue("statuses", value);

  const openCreate = () => {
    const nextState = createDefaultFormState();
    const assignable = [...ROLE_ASSIGNABLE[currentUserRole]] as Role[];
    if (assignable.length > 0) {
      nextState.role = assignable.includes("user") ? "user" : assignable[0];
    }
    setFormState(nextState);
    setSelectedRecord(null);
    setMode("create");
  };

  const renderFilterControls = (stacked = false) => {
    const stackedGrid = "grid w-full gap-3 grid-cols-1";
    const compactGrid =
      "grid w-full gap-3 grid-cols-1 md:grid-cols-3 lg:w-fit lg:gap-2 lg:[grid-template-columns:repeat(6,max-content)]";
    return (
      <>
        <div
          className={stacked ? stackedGrid : compactGrid}
        >
          <FilterDropdown
            label="Record type"
            options={recordTypeOptions}
            selected={filters.recordTypes}
            onToggle={handleRecordTypeToggle}
          />
          <FilterDropdown
            label="Engagement tier"
            options={engagementOptions as FilterOption<EngagementTier>[]}
            selected={filters.engagementTiers}
            onToggle={handleEngagementToggle}
          />
          <FilterDropdown
            label="Country"
            options={countryOptions}
            selected={filters.countries}
            onToggle={toggleCountry}
          />
          <FilterDropdown
            label="City"
            options={cityOptions}
            selected={filters.cities}
            onToggle={handleCityToggle}
            emptyLabel="Select a country to narrow cities"
          />
          <FilterDropdown
            label="Category"
            options={categoryOptions}
            selected={filters.categories}
            onToggle={handleCategoryToggle}
          />
          <FilterDropdown
            label="Collab status"
            options={statusOptions as FilterOption<CollaborationStatus>[]}
            selected={filters.statuses}
            onToggle={handleStatusToggle}
          />
        </div>
        <div
          className={
            stacked
              ? "flex w-full flex-col gap-3"
              : "flex flex-wrap items-center gap-3 md:ms-auto"
          }
        >
        <button
          type="button"
          className={`rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:border-white/40 hover:text-white ${stacked ? "w-full" : ""}`}
          onClick={handleResetFilters}
        >
          Reset
        </button>
        {permissions.canCreate && (
          <Button
            variant="default"
            className={`${stacked ? "w-full" : "ms-auto"} bg-white text-black hover:bg-white/90`}
            onClick={openCreate}
          >
            + New person
          </Button>
        )}
        </div>
      </>
    );
  };

  const openEdit = (record: PersonRecord) => {
    setFormState(getInitialFormFromRecord(record));
    setSelectedRecord(record);
    setMode("edit");
  };

  const openDetail = useCallback((record: PersonRecord) => {
    setFormState(getInitialFormFromRecord(record));
    setSelectedRecord(record);
    setMode("view");
  }, []);

  const closeForm = () => {
    setMode(null);
    setFormState(createDefaultFormState());
    setSelectedRecord(null);
  };

  const enterEditMode = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const targetRecordId = selectedRecord?.recordId ?? formState.recordId ?? null;
    const canEditSelected = permissions.canEdit || (targetRecordId !== null && targetRecordId === currentUserRecordId);
    if (!canEditSelected) {
      toast({
        title: "Insufficient permissions",
        description: "You can only edit records you own.",
        status: "error",
        variant: "destructive",
      });
      return;
    }
    if (selectedRecord) {
      setFormState(getInitialFormFromRecord(selectedRecord));
      setMode("edit");
      return;
    }

    if (formState.recordId) {
      const matchingRecord = records.find((record) => record.recordId === formState.recordId);
      if (matchingRecord) {
        setSelectedRecord(matchingRecord);
        setFormState(getInitialFormFromRecord(matchingRecord));
      }
    }

    setMode("edit");
  };

  const performDelete = (recordId: string) => {
    const toastId = createLoadingToast("Deleting record", "Removing this profile from the system...");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${recordId}`, { method: "DELETE" });
        if (!response.ok) {
          resolveToast({
            toastId,
            title: "Delete failed",
            description: "Unable to delete record.",
            status: "error",
          });
          return;
        }

        resolveToast({
          toastId,
          title: "Record deleted",
          description: `${recordId} was removed successfully.`,
          status: "success",
        });
        router.refresh();
      } catch (error) {
        console.error(error);
        resolveToast({
          toastId,
          title: "Delete failed",
          description: "Network error. Please retry.",
          status: "error",
        });
      }
    });
  };

  const openDeleteDialog = (record: PersonRecord) => {
    if (!permissions.canDelete) {
      toast({
        title: "Insufficient permissions",
        description: "Ask an admin to remove records.",
        status: "error",
        variant: "destructive",
      });
      return;
    }

    setDeleteTarget(record);
  };

  useEffect(() => {
    const handleAccountModalOpen = (event: Event) => {
      const detail = (event as CustomEvent<DashboardAccountEventDetail>).detail;
      const recordId = detail?.recordId ?? undefined;
      if (!recordId) {
        toast({
          title: "Profile not linked",
          description: "Your account is not connected to a person record yet.",
          status: "error",
          variant: "destructive",
        });
        return;
      }

      const record = records.find((entry) => entry.recordId === recordId);
      if (!record) {
        toast({
          title: "Record missing",
          description: "We could not find the profile associated with your account.",
          status: "error",
          variant: "destructive",
        });
        return;
      }

      openDetail(record);
    };

    window.addEventListener(DASHBOARD_ACCOUNT_EVENT, handleAccountModalOpen as EventListener);
    return () => {
      window.removeEventListener(DASHBOARD_ACCOUNT_EVENT, handleAccountModalOpen as EventListener);
    };
  }, [openDetail, records]);

  const closeDeleteDialog = () => {
    if (!isPending) {
      setDeleteTarget(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    const recordId = deleteTarget.recordId;
    setDeleteTarget(null);
    performDelete(recordId);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requiredFields: Array<[keyof FormState, string]> = [
      ["fullName", "Full name"],
      ["preferredName", "Preferred name"],
      ["gender", "Gender"],
      ["birthDate", "Birth date"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["country", "Country"],
      ["city", "City"],
      ["occupation", "Occupation"],
      ["languages", "Languages"],
    ];

    for (const [field, label] of requiredFields) {
      if (!formState[field] || String(formState[field]).trim().length === 0) {
        toast({
          title: "Missing information",
          description: `${label} is required.`,
          status: "error",
          variant: "destructive",
        });
        return;
      }
    }

    const parseNumberValue = (value: string, label: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      const parsed = Number(trimmed.replace(/,/g, ""));
      if (!Number.isFinite(parsed)) {
        throw new Error(`${label} must be a valid number.`);
      }
      return parsed;
    };

    const getOptionalValue = (value: string) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    let followersCountValue: number | undefined;
    let secondaryFollowersCountValue: number | undefined;
    let totalFollowersCountValue: number | undefined;
    let averageMonthlyReachValue: number | undefined;
    let engagementRateValue: number | undefined;

    try {
      followersCountValue = parseNumberValue(formState.followersCount, "Followers count");
      secondaryFollowersCountValue = parseNumberValue(
        formState.secondaryFollowersCount,
        "Secondary followers count"
      );
      averageMonthlyReachValue = parseNumberValue(
        formState.averageMonthlyReach,
        "Average monthly reach"
      );
    } catch (error) {
      toast({
        title: "Invalid number",
        description: error instanceof Error ? error.message : "Please enter valid numeric values.",
        status: "error",
        variant: "destructive",
      });
      return;
    }

    const followerParts = [followersCountValue, secondaryFollowersCountValue].filter(
      (value): value is number => typeof value === "number"
    );
    if (followerParts.length > 0) {
      totalFollowersCountValue = followerParts.reduce((acc, value) => acc + value, 0);
    }

    if (
      typeof totalFollowersCountValue === "number" &&
      typeof averageMonthlyReachValue === "number" &&
      averageMonthlyReachValue > 0
    ) {
      engagementRateValue = totalFollowersCountValue / averageMonthlyReachValue / 4;
    }

    let engagementRateTierValue: string | undefined;
    if (typeof engagementRateValue === "number") {
      if (engagementRateValue > 0.07) {
        engagementRateTierValue = "high";
      } else if (engagementRateValue >= 0.05) {
        engagementRateTierValue = "medium";
      } else if (engagementRateValue >= 0) {
        engagementRateTierValue = "low";
      }
    }

    const isCreate = mode === "create";
    const toastId = createLoadingToast(
      isCreate ? "Creating record" : "Updating record",
      "Hang tight while we sync your changes."
    );
    startTransition(async () => {
      const payload = {
        record_type: formState.recordType,
        full_name: formState.fullName,
        preferred_name: formState.preferredName,
        gender: formState.gender,
        birth_date: formState.birthDate,
        email: formState.email,
        phone: formState.phone,
        country: formState.country,
        city: formState.city,
        occupation: formState.occupation,
        influencer_category: getOptionalValue(formState.influencerCategory),
        primary_platform: getOptionalValue(formState.primaryPlatform),
        secondary_platform: getOptionalValue(formState.secondaryPlatform),
        followers_count: followersCountValue,
        secondary_followers_count: secondaryFollowersCountValue,
        total_followers_count: totalFollowersCountValue,
        average_monthly_reach: averageMonthlyReachValue,
        engagement_rate: engagementRateValue,
        engagement_rate_tier: engagementRateTierValue || undefined,
        languages: normalizeLanguages(formState.languages),
        interests: getOptionalValue(formState.interests),
        notes: getOptionalValue(formState.notes),
        collaboration_status: formState.collaborationStatus,
        portfolio_url: getOptionalValue(formState.portfolioUrl),
        last_contact_date: getOptionalValue(formState.lastContactDate),
        ...(roleSelectDisabled ? {} : { role: formState.role }),
      };

      const endpoint = isCreate ? "/api/users" : `/api/users/${formState.recordId}`;
      const method = isCreate ? "POST" : "PATCH";

      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          resolveToast({
            toastId,
            title: "Save failed",
            description: result?.message ?? "Unable to save record.",
            status: "error",
          });
          return;
        }

        resolveToast({
          toastId,
          title: isCreate ? "Record created" : "Record updated",
          description: isCreate
            ? "New profile added to the dashboard."
            : "Changes synced successfully.",
          status: "success",
        });
        closeForm();
        router.refresh();
      } catch (error) {
        console.error(error);
        resolveToast({
          toastId,
          title: "Save failed",
          description: "Network error. Please retry.",
          status: "error",
        });
      }
    });
  };

  const isViewingOwnRecord =
    mode === "view" && (selectedRecord?.recordId ?? formState.recordId ?? null) === currentUserRecordId;
  const canEditSelectedRecord = permissions.canEdit || isViewingOwnRecord;

  const actionButtons = (() => {
    if (mode === "view") {
      return (
        <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-white/10 bg-[#090909] pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            onClick={closeForm}
          >
            Close
          </Button>
          {canEditSelectedRecord && (
            <Button
              type="button"
              variant="default"
              className="bg-white text-black hover:bg-white/90"
              onClick={enterEditMode}
            >
              Edit
            </Button>
          )}
        </div>
      );
    }

    if (mode === "edit") {
      return (
        <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-white/10 bg-[#090909] pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            onClick={closeForm}
            disabled={isPending}
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="default"
            className="bg-white text-black hover:bg-white/90"
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Update"}
          </Button>
        </div>
      );
    }

    return (
      <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-white/10 bg-[#090909] pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="border-white/40 bg-white/10 text-white hover:bg-white/20"
          onClick={closeForm}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          className="bg-white text-black hover:bg-white/90"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Create"}
        </Button>
      </div>
    );
  })();

  return (
    <div className="flex flex-col gap-8 text-white">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          >
            <div className="flex items-end justify-between gap-6">
              <div className="flex flex-1 flex-col gap-1 text-white/60">
                <p className="text-xs uppercase tracking-[0.3em]">{card.label}</p>
              </div>
              <p className="text-right text-3xl font-semibold text-white md:text-4xl">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="hidden w-full flex-col gap-4 md:flex">
        {renderFilterControls()}
      </div>
      <div className="w-full md:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm uppercase tracking-[0.3em] text-white/70"
          onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
        >
          Filters
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px]">
            {activeFiltersCount}
          </span>
        </button>
        {isMobileFiltersOpen && (
          <div className="mt-4 flex flex-col gap-4">
            {renderFilterControls(true)}
          </div>
        )}
      </div>

      <div className="w-full md:hidden">
        {displayedRecords.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-center text-sm text-white/60">
            No records match current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {displayedRecords.map((record) => {
              const canEditRecord = permissions.canEdit || record.recordId === currentUserRecordId;
              return (
                <div
                  key={`${record.recordId}-card`}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_0_35px_rgba(0,0,0,0.4)] transition hover:border-white/30 hover:bg-white/5"
                  onClick={() => openDetail(record)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{formatTextValue(record.fullName)}</p>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">#{record.recordId}</p>
                    </div>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/70">
                      {formatUpperValue(record.recordType)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/70">
                    <div>
                      <p className="uppercase tracking-[0.3em] text-[10px] text-white/40">Tier</p>
                      <p>{formatUpperValue(record.engagementRateTier)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.3em] text-[10px] text-white/40">Status</p>
                      <p>{formatUpperValue(record.collaborationStatus)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.3em] text-[10px] text-white/40">Country</p>
                      <p>{formatTextValue(record.country)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.3em] text-[10px] text-white/40">Category</p>
                      <p>{formatTextValue(record.influencerCategory)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-white/30 text-white hover:bg-white/10"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetail(record);
                      }}
                    >
                      View
                    </Button>
                    {canEditRecord && (
                      <Button
                        variant="ghost"
                        className="flex-1 border border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(record);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {permissions.canDelete && (
                      <Button
                        variant="destructive"
                        className="flex-1 border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDeleteDialog(record);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {displayedRecords.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <p>
              {`Showing ${paginationStart.toLocaleString()}-${paginationEnd.toLocaleString()} of ${filteredRecords.length.toLocaleString()} records`}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="flex-1 rounded-full border border-white/20 px-4 py-2 tracking-[0.3em] transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                onClick={() =>
                  setCurrentPage((prev) => Math.max(1, Math.min(totalPages, prev - 1)))
                }
                disabled={!canGoPrevious}
              >
                Prev
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border border-white/20 px-4 py-2 tracking-[0.3em] transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                onClick={() =>
                  setCurrentPage((prev) => Math.max(1, Math.min(totalPages, prev + 1)))
                }
                disabled={!canGoNext}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_0_50px_rgba(0,0,0,0.35)] md:block">
        <div className="overflow-x-auto neo-scroll">
          <table className="w-full table-auto text-sm">
            <thead className="bg-white/5 text-left text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th key={column.key} className="px-5 py-3">{column.label}</th>
                ))}
                {(permissions.canEdit || permissions.canDelete || currentUserRecordId) && (
                  <th className="px-5 py-3">actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {displayedRecords.map((record) => (
                <tr
                  key={record.recordId}
                  className="cursor-pointer transition hover:bg-white/5"
                  onClick={() => openDetail(record)}
                >
                  {(() => {
                    const canEditRecord = permissions.canEdit || record.recordId === currentUserRecordId;
                    const showActions = canEditRecord || permissions.canDelete;
                    return (
                      <>
                        {TABLE_COLUMNS.map((column) => {
                          const cellClass = column.cellClassName
                            ? `px-5 py-4 align-top text-white/70 ${column.cellClassName}`
                            : "px-5 py-4 align-top text-white/70";
                          return (
                            <td key={`${record.recordId}-${column.key}`} className={cellClass}>
                              {column.render(record)}
                            </td>
                          );
                        })}
                        {showActions && (
                          <td className="px-5 py-4 align-top" onClick={(event) => event.stopPropagation()}>
                            <div className="flex gap-2">
                              {canEditRecord && (
                                <Button
                                  variant="ghost"
                                  className="h-8 rounded-full bg-white/10 px-4 text-xs text-white hover:text-black hover:bg-white/10"
                                  onClick={() => openEdit(record)}
                                >
                                  Edit
                                </Button>
                              )}
                              {permissions.canDelete && (
                                <Button
                                  variant="outline"
                                  className="h-8 rounded-full border border-red-500/60 px-4 text-xs text-red-400 hover:bg-red-500/10"
                                  onClick={() => openDeleteDialog(record)}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/5 px-5 py-4 text-[11px] uppercase tracking-[0.3em] text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            {filteredRecords.length === 0
              ? "No records match current filters"
              : `Showing ${paginationStart.toLocaleString()}-${paginationEnd.toLocaleString()} of ${filteredRecords.length.toLocaleString()} records`}
          </p>
          <div className="flex items-center gap-3 text-white/70">
            <button
              type="button"
              className="rounded-full border border-white/20 px-4 py-2 tracking-[0.3em] transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
              onClick={() =>
                setCurrentPage((prev) => Math.max(1, Math.min(totalPages, prev - 1)))
              }
              disabled={!canGoPrevious || filteredRecords.length === 0}
            >
              Prev
            </button>
            <span className="text-white/60">
              Page {filteredRecords.length === 0 ? 0 : safePage} / {filteredRecords.length === 0 ? 0 : totalPages}
            </span>
            <button
              type="button"
              className="rounded-full border border-white/20 px-4 py-2 tracking-[0.3em] transition hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
              onClick={() =>
                setCurrentPage((prev) => Math.max(1, Math.min(totalPages, prev + 1)))
              }
              disabled={!canGoNext || filteredRecords.length === 0}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur">
          <div className="flex w-full max-w-6xl h-[90vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#090909] p-8 text-white shadow-[0_0_80px_rgba(0,0,0,0.7)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{modalTitle}</h3>
                {modalSubtitle && <p className="text-sm text-white/50">{modalSubtitle}</p>}
              </div>
            </div>
            <form
              className="mt-6 flex flex-1 min-h-0 flex-col gap-6"
              onSubmit={isReadOnlyMode ? (event) => event.preventDefault() : handleSubmit}
            >
              <div className="flex-1 min-h-0 overflow-y-auto pr-4 neo-scroll">
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FormField label="Record type">
                      <select
                        value={formState.recordType}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            recordType: event.target.value as RecordType,
                          }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        disabled={isReadOnlyMode}
                      >
                        <option value="individual" className="bg-black text-white">
                          Individual
                        </option>
                        <option value="influencer" className="bg-black text-white">
                          Influencer
                        </option>
                      </select>
                    </FormField>
                    <FormField label="Role">
                      <select
                        value={formState.role}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, role: event.target.value as Role }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm capitalize text-white"
                        disabled={roleSelectDisabled}
                      >
                        {roleOptionsForSelect.map((roleOption) => (
                          <option key={roleOption} value={roleOption} className="bg-black text-white">
                            {roleOption}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Full name">
                      <Input
                        value={formState.fullName}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        required
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                    <FormField label="Preferred name">
                      <Input
                        value={formState.preferredName}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, preferredName: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        required
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Gender">
                      <select
                        value={formState.gender}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, gender: event.target.value }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        required
                        disabled={isReadOnlyMode}
                      >
                        <option value="Male" className="bg-black text-white">
                          Male
                        </option>
                        <option value="Female" className="bg-black text-white">
                          Female
                        </option>
                        <option value="Other" className="bg-black text-white">
                          Other
                        </option>
                      </select>
                    </FormField>
                    <FormField label="Birth date">
                      <DatePicker
                        date={parseDateOrUndefined(formState.birthDate)}
                        onDateChange={(date) =>
                          setFormState((prev) => ({
                            ...prev,
                            birthDate: date ? format(date, "yyyy-MM-dd") : "",
                          }))
                        }
                        disabled={isReadOnlyMode}
                        placeholder="Select date"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Email">
                      <Input
                        type="email"
                        value={formState.email}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        required
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                    <FormField label="Phone">
                      <Input
                        value={formState.phone}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        required
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Country">
                      <Input
                        value={formState.country}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, country: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        required
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                    <FormField label="City">
                      <Input
                        value={formState.city}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, city: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        required
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Occupation">
                      <select
                        value={formState.occupation}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, occupation: event.target.value }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        required
                        disabled={isReadOnlyMode}
                      >
                        <option value="" className="bg-black text-white">
                          Select occupation
                        </option>
                        {OCCUPATION_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-black text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Influencer category">
                      <select
                        value={formState.influencerCategory}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, influencerCategory: event.target.value }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        disabled={isReadOnlyMode}
                      >
                        <option value="" className="bg-black text-white">
                          Select category
                        </option>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-black text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Primary platform">
                      <select
                        value={formState.primaryPlatform}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, primaryPlatform: event.target.value }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        disabled={isReadOnlyMode}
                      >
                        <option value="" className="bg-black text-white">
                          Select platform
                        </option>
                        {PLATFORM_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-black text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Secondary platform">
                      <select
                        value={formState.secondaryPlatform}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, secondaryPlatform: event.target.value }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        disabled={isReadOnlyMode}
                      >
                        <option value="" className="bg-black text-white">
                          Select platform
                        </option>
                        {PLATFORM_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-black text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Followers count">
                      <Input
                        type="number"
                        value={formState.followersCount}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, followersCount: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                    <FormField label="Secondary followers count">
                      <Input
                        type="number"
                        value={formState.secondaryFollowersCount}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            secondaryFollowersCount: event.target.value,
                          }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Total followers (calculated)">
                      <Input
                        type="text"
                        value={totalFollowersDisplay}
                        readOnly
                        className="border-white/10 bg-white/10 text-white placeholder:text-white/40"
                        disabled
                      />
                    </FormField>
                    <FormField label="Average monthly reach">
                      <Input
                        type="number"
                        value={formState.averageMonthlyReach}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, averageMonthlyReach: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Engagement rate (calculated)">
                      <Input
                        type="text"
                        value={engagementRateDisplay}
                        readOnly
                        className="border-white/10 bg-white/10 text-white placeholder:text-white/40"
                        disabled
                      />
                    </FormField>
                    <FormField label="Engagement tier (auto)">
                      <Input
                        type="text"
                        value={engagementTierDisplay}
                        readOnly
                        className="border-white/10 bg-white/10 text-white placeholder:text-white/40"
                        disabled
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Collaboration status">
                      <select
                        value={formState.collaborationStatus}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, collaborationStatus: event.target.value }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        disabled={isReadOnlyMode}
                      >
                        <option value="active" className="bg-black text-white">
                          Active
                        </option>
                        <option value="paused" className="bg-black text-white">
                          Paused
                        </option>
                        <option value="completed" className="bg-black text-white">
                          Completed
                        </option>
                      </select>
                    </FormField>
                    <FormField label="Last contact date">
                      <DatePicker
                        date={parseDateOrUndefined(formState.lastContactDate)}
                        onDateChange={(date) =>
                          setFormState((prev) => ({
                            ...prev,
                            lastContactDate: date ? format(date, "yyyy-MM-dd") : "",
                          }))
                        }
                        disabled={isReadOnlyMode}
                        placeholder="Select date"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Languages">
                      <div className="grid w-full grid-cols-1 place-items-center gap-3 md:grid-cols-2 lg:place-items-start">
                        {LANGUAGE_OPTIONS.map((language) => {
                          const checked = selectedLanguages.includes(language);
                          return (
                            <label key={language} className="flex items-center gap-2 text-sm text-white/80">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-white/40 bg-transparent text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                                checked={checked}
                                onChange={() => handleLanguageToggle(language)}
                                disabled={isReadOnlyMode}
                              />
                              <span>{language}</span>
                            </label>
                          );
                        })}
                      </div>
                    </FormField>
                    <FormField label="Portfolio URL">
                      <Input
                        type="url"
                        value={formState.portfolioUrl}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, portfolioUrl: event.target.value }))
                        }
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField label="Interests" className="lg:col-span-2">
                      <textarea
                        value={formState.interests}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, interests: event.target.value }))
                        }
                        className="h-24 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                    <FormField label="Notes" className="lg:col-span-2">
                      <textarea
                        value={formState.notes}
                        onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                        className="h-24 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                        disabled={isReadOnlyMode}
                      />
                    </FormField>
                  </div>
                </div>
              </div>
              {actionButtons}
            </form>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen) {
            closeDeleteDialog();
          }
        }}
      >
        <AlertDialogContent className="border-white/10 bg-[#0b0b0b] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This action permanently removes {deleteTarget?.fullName || deleteTarget?.recordId}. You
              will not be able to recover it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={closeDeleteDialog}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              disabled={isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

function FormField({ label, children, className }: FormFieldProps) {
  const wrapperClass = className ? `flex flex-col gap-2 ${className}` : "flex flex-col gap-2";
  return (
    <div className={wrapperClass}>
      <Label className="text-sm font-medium text-white/70">{label}</Label>
      {children}
    </div>
  );
}

type FilterDropdownProps<T extends string> = {
  label: string;
  options: FilterOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  emptyLabel?: string;
};

function FilterDropdown<T extends string>({
  label,
  options,
  selected,
  onToggle,
  emptyLabel,
}: FilterDropdownProps<T>) {
  const selectedCount = selected.length;
  const hasOptions = options.length > 0;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  return (
    <div ref={containerRef} className="relative w-full text-white sm:w-auto">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:border-white/40 hover:text-white sm:w-auto sm:justify-start"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{label}</span>
        {selectedCount > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white">
            {selectedCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          className="absolute left-1/2 z-40 mt-2 w-[calc(100vw-3rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-3 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur sm:left-auto sm:right-0 sm:w-64 sm:max-w-none sm:translate-x-0"
        >
          {hasOptions ? (
            <div className="grid w-full max-h-60 grid-cols-1 place-items-center gap-2 overflow-y-auto pr-1 neo-scroll md:grid-cols-2 lg:place-items-start">
              {options.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <label key={option.value} className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/40 bg-transparent text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                      checked={checked}
                      onChange={() => onToggle(option.value)}
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/50">{emptyLabel ?? "No options available"}</p>
          )}
        </div>
      )}
    </div>
  );
}

