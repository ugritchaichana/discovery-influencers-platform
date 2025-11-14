"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/components/ui/use-toast";
import { createLoadingToast, resolveToast } from "@/lib/toast-feedback";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type AuthCardProps = {
  mode: AuthMode;
};

const CITY_OPTIONS = {
  Thailand: ["Bangkok", "Chiang Mai", "Phuket", "Khon Kaen"],
  "United State": ["New York", "Los Angeles", "San Francisco", "Chicago"],
  China: ["Beijing", "Shanghai", "Shenzhen", "Guangzhou"],
} as const;

const COUNTRY_OPTIONS = Object.keys(CITY_OPTIONS) as Array<keyof typeof CITY_OPTIONS>;

const OCCUPATION_OPTIONS = [
  "Content Creator",
  "Marketing Specialist",
  "Designer",
  "Developer",
  "Entrepreneur",
  "Photographer",
];

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

const LANGUAGE_OPTIONS = ["TH", "EN", "CN"] as const;
const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
const RECORD_TYPE_OPTIONS = ["individual", "influencer"] as const;
const TOGGLE_CHIP_BASE_CLASS =
  "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-center text-[10px] uppercase tracking-[0.4em] text-white/60 transition hover:border-white/40 hover:text-white";
const TOGGLE_CHIP_ACTIVE_CLASS =
  "border-white/60 bg-white text-black hover:bg-white/90 hover:text-black";

const parseNumericOrNull = (input: string): number | null => {
  const trimmed = input?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateOrUndefined = (value?: string) => {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  } catch {
    return undefined;
  }
};

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [gender, setGender] = useState("Male");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("+66");
  const [country, setCountry] = useState<(typeof COUNTRY_OPTIONS)[number]>(COUNTRY_OPTIONS[0]);
  const [city, setCity] = useState<string>(CITY_OPTIONS[COUNTRY_OPTIONS[0]][0]);
  const [occupation, setOccupation] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [recordType, setRecordType] = useState("individual");
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [secondaryPlatform, setSecondaryPlatform] = useState("");
  const [influencerCategory, setInfluencerCategory] = useState("");
  const [followersCount, setFollowersCount] = useState("");
  const [secondaryFollowersCount, setSecondaryFollowersCount] = useState("");
  const [averageMonthlyReach, setAverageMonthlyReach] = useState("");
  const [notes, setNotes] = useState("");
  const [interests, setInterests] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { totalFollowersDisplay, engagementRateDisplay, engagementTierDisplay } = useMemo(() => {
    const followersParsed = parseNumericOrNull(followersCount);
    const secondaryParsed = parseNumericOrNull(secondaryFollowersCount);
    const averageReachParsed = parseNumericOrNull(averageMonthlyReach);

    const pieces: number[] = [];
    if (followersParsed !== null) {
      pieces.push(followersParsed);
    }
    if (secondaryParsed !== null) {
      pieces.push(secondaryParsed);
    }
    const totalValue = pieces.length > 0 ? pieces.reduce((acc, value) => acc + value, 0) : null;

    let computedEngagement: number | null = null;
    if (totalValue !== null && averageReachParsed !== null && averageReachParsed > 0) {
      computedEngagement = totalValue / averageReachParsed / 4;
    }

    let computedTier: string | null = null;
    if (computedEngagement !== null) {
      if (computedEngagement > 0.07) {
        computedTier = "high";
      } else if (computedEngagement >= 0.05) {
        computedTier = "medium";
      } else if (computedEngagement >= 0) {
        computedTier = "low";
      }
    }

    return {
      totalFollowersDisplay: totalValue !== null ? totalValue.toLocaleString() : "—",
      engagementRateDisplay: computedEngagement !== null ? computedEngagement.toFixed(4) : "—",
      engagementTierDisplay: computedTier ? computedTier.toUpperCase() : "—",
    };
  }, [followersCount, secondaryFollowersCount, averageMonthlyReach]);

  const title = mode === "login" ? "Login" : "Create your account";
  const actionLabel = mode === "login" ? "Login" : "Create account";
  const isLogin = mode === "login";

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    let followersValueParsed: number | undefined;
    let secondaryFollowersValueParsed: number | undefined;
    let averageMonthlyReachParsed: number | undefined;
    let totalFollowersParsed: number | undefined;
    let engagementRateParsed: number | undefined;
    let engagementTierParsed: string | undefined;

    if (!email || !password) {
      const message = "Please provide both email and password.";
      setError(message);
      toast({
        title: "Missing credentials",
        description: message,
        status: "error",
        variant: "destructive",
      });
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        const message = "Password must be at least 8 characters long.";
        setError(message);
        toast({
          title: "Weak password",
          description: message,
          status: "error",
          variant: "destructive",
        });
        return;
      }

      if (password !== confirmPassword) {
        const message = "Passwords do not match.";
        setError(message);
        toast({
          title: "Password mismatch",
          description: message,
          status: "error",
          variant: "destructive",
        });
        return;
      }

      if (!fullName || !preferredName || !birthDate || !occupation || !city) {
        const message = "Please fill in all required profile fields.";
        setError(message);
        toast({
          title: "Missing profile fields",
          description: message,
          status: "error",
          variant: "destructive",
        });
        return;
      }

      if (languages.length === 0) {
        const message = "Please select at least one language.";
        setError(message);
        toast({
          title: "Languages required",
          description: message,
          status: "error",
          variant: "destructive",
        });
        return;
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

      try {
        followersValueParsed = parseNumberValue(followersCount, "Followers count");
        secondaryFollowersValueParsed = parseNumberValue(
          secondaryFollowersCount,
          "Secondary followers count"
        );
        averageMonthlyReachParsed = parseNumberValue(
          averageMonthlyReach,
          "Average monthly reach"
        );

        const followerPieces = [followersValueParsed, secondaryFollowersValueParsed].filter(
          (entry): entry is number => typeof entry === "number"
        );
        if (followerPieces.length > 0) {
          totalFollowersParsed = followerPieces.reduce((acc, value) => acc + value, 0);
        }

        if (
          typeof totalFollowersParsed === "number" &&
          typeof averageMonthlyReachParsed === "number" &&
          averageMonthlyReachParsed > 0
        ) {
          engagementRateParsed = totalFollowersParsed / averageMonthlyReachParsed / 4;
        }

        if (typeof engagementRateParsed === "number") {
          if (engagementRateParsed > 0.07) {
            engagementTierParsed = "high";
          } else if (engagementRateParsed >= 0.05) {
            engagementTierParsed = "medium";
          } else if (engagementRateParsed >= 0) {
            engagementTierParsed = "low";
          }
        }
      } catch (numberError) {
        const message =
          numberError instanceof Error ? numberError.message : "Please enter valid numeric values.";
        setError(message);
        toast({
          title: "Invalid number",
          description: message,
          status: "error",
          variant: "destructive",
        });
        return;
      }
    }

    const toastId = createLoadingToast(
      mode === "login" ? "Signing in" : "Creating account",
      mode === "login" ? "Verifying your credentials..." : "Setting up your profile..."
    );

    startTransition(async () => {
      try {
        if (mode === "login") {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const payload = await response.json();
          if (!response.ok) {
            const message = payload?.message ?? "Unable to login.";
            setError(message);
            resolveToast({
              toastId,
              title: "Login failed",
              description: message,
              status: "error",
            });
            return;
          }

          setSuccess("Signed in successfully. Redirecting to your dashboard...");
          resolveToast({
            toastId,
            title: "Login successful",
            description: "Redirecting you to the dashboard...",
            status: "success",
          });
          setTimeout(() => {
            router.push("/");
          }, 600);
          return;
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            confirm_password: confirmPassword,
            full_name: fullName,
            preferred_name: preferredName,
            gender,
            birth_date: birthDate,
            phone,
            country,
            city,
            occupation,
            languages,
            record_type: recordType,
            primary_platform: primaryPlatform,
            secondary_platform: secondaryPlatform,
            influencer_category: influencerCategory,
            followers_count: followersValueParsed,
            secondary_followers_count: secondaryFollowersValueParsed,
            total_followers_count: totalFollowersParsed,
            average_monthly_reach: averageMonthlyReachParsed,
            engagement_rate: engagementRateParsed,
            engagement_rate_tier: engagementTierParsed,
            notes,
            interests,
            collaboration_status: "active",
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          const message = payload?.message ?? "Unable to create account.";
          setError(message);
          resolveToast({
            toastId,
            title: "Signup failed",
            description: message,
            status: "error",
          });
          return;
        }

        setSuccess("Account created. Redirecting to your dashboard...");
        resolveToast({
          toastId,
          title: "Account created",
          description: "Redirecting you to the dashboard...",
          status: "success",
        });
        setTimeout(() => {
          router.push("/");
        }, 800);
      } catch (submissionError) {
        console.error(submissionError);
        const message = "Something went wrong. Please try again.";
        setError(message);
        resolveToast({
          toastId,
          title: "Network error",
          description: message,
          status: "error",
        });
      }
    });
  };

  const handleLanguageToggle = (code: string) => {
    setLanguages((current) =>
      current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code]
    );
  };

  const cardWidthClass = mode === "signup" ? "max-w-6xl" : "max-w-lg";
  const credentialGridClass = mode === "signup" ? "grid grid-cols-1 gap-4 md:grid-cols-2" : "grid grid-cols-1 gap-4";

  return (
    <Card
      className={cn(
        "mx-auto flex w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#090909] text-white shadow-[0_0_80px_rgba(0,0,0,0.7)]",
        cardWidthClass
      )}
    >
      <CardHeader className="flex flex-col gap-2 border-b border-white/10 p-8">
        <CardTitle className="text-3xl font-semibold tracking-tight text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col p-8">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 pb-6">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-white">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        disabled={isPending}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferredName" className="text-white">
                        Preferred name
                      </Label>
                      <Input
                        id="preferredName"
                        value={preferredName}
                        onChange={(event) => setPreferredName(event.target.value)}
                        disabled={isPending}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white">Gender</Label>
                      <div className="flex flex-wrap gap-2">
                        {GENDER_OPTIONS.map((option) => {
                          const selected = gender === option;
                          return (
                            <Button
                              key={option}
                              type="button"
                              variant="outline"
                              aria-pressed={selected}
                              className={cn(
                                TOGGLE_CHIP_BASE_CLASS,
                                selected && TOGGLE_CHIP_ACTIVE_CLASS
                              )}
                              onClick={() => setGender(option)}
                              disabled={isPending}
                            >
                              {option}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate" className="text-white">
                        Birth date
                      </Label>
                      <DatePicker
                        date={parseDateOrUndefined(birthDate)}
                        onDateChange={(date) =>
                          setBirthDate(date ? format(date, "yyyy-MM-dd") : "")
                        }
                        disabled={isPending}
                        placeholder="Select date"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={isPending}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="occupation" className="text-white">
                        Occupation
                      </Label>
                      <select
                        id="occupation"
                        value={occupation}
                        onChange={(event) => setOccupation(event.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        <option value="" disabled>
                          Select occupation
                        </option>
                        {OCCUPATION_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-slate-800 text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-white">
                        Country
                      </Label>
                      <select
                        id="country"
                        value={country}
                        onChange={(event) => {
                          const value = event.target.value as (typeof COUNTRY_OPTIONS)[number];
                          setCountry(value);
                          const defaultCity = CITY_OPTIONS[value][0] ?? "";
                          setCity(defaultCity);
                        }}
                        disabled={isPending}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-slate-800 text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-white">
                        City
                      </Label>
                      <select
                        id="city"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        {(CITY_OPTIONS[country] ?? []).map((option) => (
                          <option key={option} value={option} className="bg-slate-800 text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white">Languages</Label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGE_OPTIONS.map((code) => {
                          const selected = languages.includes(code);
                          return (
                            <Button
                              key={code}
                              type="button"
                              variant="outline"
                              aria-pressed={selected}
                              className={cn(
                                TOGGLE_CHIP_BASE_CLASS,
                                "tracking-[0.6em]",
                                selected && TOGGLE_CHIP_ACTIVE_CLASS
                              )}
                              onClick={() => handleLanguageToggle(code)}
                              disabled={isPending}
                            >
                              {code}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Record type</Label>
                      <div className="flex flex-wrap gap-2">
                        {RECORD_TYPE_OPTIONS.map((option) => {
                          const selected = recordType === option;
                          return (
                            <Button
                              key={option}
                              type="button"
                              variant="outline"
                              aria-pressed={selected}
                              className={cn(
                                TOGGLE_CHIP_BASE_CLASS,
                                selected && TOGGLE_CHIP_ACTIVE_CLASS
                              )}
                              onClick={() => setRecordType(option)}
                              disabled={isPending}
                            >
                              {option}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="primaryPlatform" className="text-white">
                        Primary platform (optional)
                      </Label>
                      <select
                        id="primaryPlatform"
                        value={primaryPlatform}
                        onChange={(event) => setPrimaryPlatform(event.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        <option value="" className="bg-slate-800 text-white">
                          Select platform
                        </option>
                        {PLATFORM_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-slate-800 text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryPlatform" className="text-white">
                        Secondary platform (optional)
                      </Label>
                      <select
                        id="secondaryPlatform"
                        value={secondaryPlatform}
                        onChange={(event) => setSecondaryPlatform(event.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        <option value="" className="bg-slate-800 text-white">
                          Select platform
                        </option>
                        {PLATFORM_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-slate-800 text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="influencerCategory" className="text-white">
                        Influencer category (optional)
                      </Label>
                      <select
                        id="influencerCategory"
                        value={influencerCategory}
                        onChange={(event) => setInfluencerCategory(event.target.value)}
                        disabled={isPending}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        <option value="" className="bg-slate-800 text-white">
                          Select category
                        </option>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option} className="bg-slate-800 text-white">
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="followersCount" className="text-white">
                        Followers count (optional)
                      </Label>
                      <Input
                        id="followersCount"
                        type="number"
                        value={followersCount}
                        onChange={(event) => setFollowersCount(event.target.value)}
                        disabled={isPending}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryFollowersCount" className="text-white">
                        Secondary followers count (optional)
                      </Label>
                      <Input
                        id="secondaryFollowersCount"
                        type="number"
                        value={secondaryFollowersCount}
                        onChange={(event) => setSecondaryFollowersCount(event.target.value)}
                        disabled={isPending}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="averageMonthlyReach" className="text-white">
                        Average monthly reach (optional)
                      </Label>
                      <Input
                        id="averageMonthlyReach"
                        type="number"
                        value={averageMonthlyReach}
                        onChange={(event) => setAverageMonthlyReach(event.target.value)}
                        disabled={isPending}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Total followers (calculated)</Label>
                      <Input
                        type="text"
                        value={totalFollowersDisplay}
                        readOnly
                        disabled
                        className="border-white/10 bg-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white">Engagement rate (calculated)</Label>
                      <Input
                        type="text"
                        value={engagementRateDisplay}
                        readOnly
                        disabled
                        className="border-white/10 bg-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Engagement tier (auto)</Label>
                      <Input
                        type="text"
                        value={engagementTierDisplay}
                        readOnly
                        disabled
                        className="border-white/10 bg-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="interests" className="text-white">
                        Interests (optional)
                      </Label>
                      <textarea
                        id="interests"
                        value={interests}
                        onChange={(event) => setInterests(event.target.value)}
                        disabled={isPending}
                        className="h-24 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-white">
                        Notes (optional)
                      </Label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        disabled={isPending}
                        className="h-24 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isPending}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                  />
                </div>
                <div className={credentialGridClass}>
                  <div className="flex flex-col gap-0">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-white">
                        Password
                      </Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isPending}
                      className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                    />
                  </div>
                  {mode === "signup" && (
                    <div className="flex flex-col gap-0">
                      <Label htmlFor="confirmPassword" className="text-white">
                        Confirm password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        disabled={isPending}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

          {(error || success) && (
            <Alert variant={success ? "success" : "error"} className="border-white/20 bg-white/10 text-white">
              <div className="flex flex-col gap-1">
                <AlertDescription>{success ?? error}</AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex w-full flex-col items-center gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-stretch sm:justify-center sm:gap-4">
            {isLogin && (
              <Button
                type="button"
                onClick={() => router.push("/signup")}
                variant="outline"
                className={cn(
                  "w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:flex-1",
                  isLogin ? "max-w-lg" : "max-w-md"
                )}
                disabled={isPending}
              >
                Sign up
              </Button>
            )}
            {!isLogin && (
              <Button
                type="button"
                onClick={() => router.push("/login")}
                variant="outline"
                className={cn(
                  "w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:flex-1",
                  isLogin ? "max-w-lg" : "max-w-md"
                )}
                disabled={isPending}
              >
                Login
              </Button>
            )}
            <Button
              type="submit"
              disabled={isPending}
              variant="default"
              className={cn(
                "w-full bg-white text-black hover:bg-white/90 sm:flex-1",
                isLogin ? "max-w-lg" : "max-w-md"
              )}
            >
              {isPending ? "Please wait..." : actionLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
