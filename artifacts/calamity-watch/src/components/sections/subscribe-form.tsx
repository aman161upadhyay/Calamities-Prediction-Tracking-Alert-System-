import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSubscription, useListPlaces, type SubscriptionResult } from "@workspace/api-client-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HAZARDS, HAZARD_LABEL, LEVEL_LABEL, errorMessage } from "@/lib/format";
import { btnPrimary } from "@/components/kit";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Enter an email address like name@example.org"),
  placeId: z.string(),
  hazard: z.string(),
  minLevel: z.enum(["elevated", "high", "severe"]),
});
type Values = z.infer<typeof schema>;

export function SubscribeResultNote({ r }: { r: SubscriptionResult }) {
  return (
    <div role="status" className="text-[14px] leading-5 max-w-[65ch]" data-testid="status-subscription">
      <p className="font-bold">{r.message}</p>
      {r.emailDeliveryConfigured === false && (
        <p className="mt-1" style={{ color: "#E8B04B" }} data-testid="text-email-not-configured">
          The confirmation email could not be sent on this deployment because no email provider is configured. Your request is recorded as pending and will not send alerts until it is confirmed.
        </p>
      )}
    </div>
  );
}

const trig = "bg-surface-2 border-line rounded-[4px] h-10";

export function SubscribeForm({ initialPlaceId }: { initialPlaceId?: string }) {
  const places = useListPlaces({ featured: true });
  const create = useCreateSubscription();
  const [result, setResult] = useState<SubscriptionResult | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", placeId: initialPlaceId ?? "any", hazard: "any", minLevel: "high" } });
  const placeName = places.data?.find((p) => String(p.place.id) === form.watch("placeId"))?.place.name;

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
            <FormControl><Input type="email" autoComplete="email" className="bg-surface-2 border-line rounded-[4px] h-10" data-testid="input-email" {...field} /></FormControl>
            <FormDescription>We send one confirmation link first. Nothing is sent until you open it.</FormDescription>
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
                  {places.data?.map((p) => <SelectItem key={p.place.id} value={String(p.place.id)}>{p.place.name}, {p.place.countryCode}</SelectItem>)}
                </SelectContent>
              </Select>
              {places.isError && <FormDescription>Place list unavailable; you can still subscribe to any place.</FormDescription>}
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
        {create.isError && <p role="alert" className="text-[14px]" style={{ color: "#FF6B3D" }}>Couldn't record the request: {errorMessage(create.error)}. Check the email and try again.</p>}
        {result && <SubscribeResultNote r={result} />}
        <p className="text-[12px] leading-4 text-muted-foreground max-w-[65ch]">These emails come from an experimental research system and are not official warnings. Every email has an unsubscribe link.</p>
      </form>
    </Form>
  );
}
