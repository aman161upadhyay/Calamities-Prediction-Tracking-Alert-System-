import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSubscription, useGetPlace, useGetSystemStatus, useListPlaces, getGetPlaceQueryKey, type SubscriptionResult } from "@workspace/api-client-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HAZARDS, HAZARD_LABEL, LEVEL_LABEL, errorMessage } from "@/lib/format";
import { btnPrimary } from "@/components/kit";
import { useMemo, useState } from "react";

const schema = z.object({
  email: z
    .string()
    .email("Enter an email address like name@example.org")
    .max(254, "An email address has at most 254 characters")
    .refine((v) => (v.split("@")[0] ?? "").length <= 64, "The part before the @ has at most 64 characters"),
  placeId: z.string(),
  hazard: z.string(),
  minLevel: z.enum(["elevated", "high", "severe"]),
});
type Values = z.infer<typeof schema>;

export function SubscribeResultNote({ r }: { r: SubscriptionResult }) {
  return (
    <div role="status" className="text-[14px] leading-5 max-w-[65ch]" data-testid="status-subscription">
      <p className="font-semibold">{r.message}</p>
      {r.emailDeliveryConfigured === false && (
        <p className="mt-1" style={{ color: "#9A6700" }} data-testid="text-email-not-configured">
          The confirmation email could not be sent on this deployment because no email provider is configured. Your request is recorded as pending and will not send alerts until it is confirmed.
        </p>
      )}
    </div>
  );
}

const trig = "bg-sheet border-rule-strong rounded-[3px] h-10";

export function SubscribeForm({ initialPlaceId }: { initialPlaceId?: string }) {
  const places = useListPlaces({ featured: true });
  // A link from a place page can name a place outside the featured list; fetch it so the selector shows its name.
  const initialId = initialPlaceId && /^\d+$/.test(initialPlaceId) ? Number(initialPlaceId) : Number.NaN;
  const initial = useGetPlace(initialId, undefined, { query: { queryKey: getGetPlaceQueryKey(initialId), enabled: Number.isFinite(initialId), staleTime: 10 * 60_000 } });
  const options = useMemo(() => {
    const list = (places.data ?? []).map((p) => ({ id: p.place.id, name: p.place.name, countryCode: p.place.countryCode }));
    const extra = initial.data?.place;
    if (extra && !list.some((p) => p.id === extra.id)) list.unshift({ id: extra.id, name: extra.name, countryCode: extra.countryCode });
    return list;
  }, [places.data, initial.data]);
  const create = useCreateSubscription();
  // Say before the user types that no confirmation email can go out on a deployment without a provider.
  const status = useGetSystemStatus();
  const emailOff = status.data?.emailDeliveryConfigured === false;
  const [result, setResult] = useState<SubscriptionResult | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", placeId: Number.isFinite(initialId) ? String(initialId) : "any", hazard: "any", minLevel: "high" } });
  const placeName = options.find((p) => String(p.id) === form.watch("placeId"))?.name;

  const submit = (v: Values) => {
    setResult(null);
    create.mutate(
      { data: { email: v.email, placeId: v.placeId === "any" ? null : Number(v.placeId), hazard: v.hazard === "any" ? null : (v.hazard as (typeof HAZARDS)[number]), minLevel: v.minLevel } },
      { onSuccess: setResult },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 max-w-[640px]" data-testid="form-subscribe">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" autoComplete="email" maxLength={254} className="bg-sheet border-rule-strong rounded-[3px] h-10" data-testid="input-email" {...field} /></FormControl>
            <FormDescription>
              {emailOff ? (
                <span style={{ color: "#9A6700" }} data-testid="text-email-provider-missing">No email provider is configured on this deployment, so no confirmation link can be sent yet. A request is recorded as pending and sends nothing until a provider is added and the address is confirmed.</span>
              ) : (
                "We send one confirmation link first. Nothing is sent until you open it."
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="placeId" render={({ field }) => (
            <FormItem>
              <FormLabel>Place</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className={trig} data-testid="select-place"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="any">Any tracked place</SelectItem>
                  {options.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}, {p.countryCode}</SelectItem>)}
                </SelectContent>
              </Select>
              {places.isError && <FormDescription>Place list unavailable; you can still subscribe to any place.</FormDescription>}
              {Number.isFinite(initialId) && initial.isError && <FormDescription>The linked place could not be loaded; pick one from the list.</FormDescription>}
            </FormItem>
          )} />
          <FormField control={form.control} name="hazard" render={({ field }) => (
            <FormItem>
              <FormLabel>Hazard</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className={trig} data-testid="select-hazard"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="any">Any hazard</SelectItem>
                  {HAZARDS.map((h) => <SelectItem key={h} value={h}>{HAZARD_LABEL[h]}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="minLevel" render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum level</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className={trig} data-testid="select-min-level"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {(["elevated", "high", "severe"] as const).map((l) => <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <div>
          <button type="submit" className={btnPrimary} disabled={create.isPending} data-testid="button-subscribe">
            {create.isPending ? "Recording request" : placeName ? `Get alerts for ${placeName}` : "Get alerts by email"}
          </button>
        </div>
        {create.isError && <p role="alert" className="text-[14px] font-semibold">Couldn't record the request: {errorMessage(create.error)}. Check the email and try again.</p>}
        {result && <SubscribeResultNote r={result} />}
        <p className="text-[12px] leading-4 text-muted-foreground max-w-[65ch]">These emails come from an experimental research system and are not official warnings. Every email has an unsubscribe link.</p>
      </form>
    </Form>
  );
}
