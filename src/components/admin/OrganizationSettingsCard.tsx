import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Settings } from "lucide-react";
import type { FormEvent } from "react";
import { FieldLabel, SectionCard } from "./shared";
import type { BillingStatus } from "./types";
import type { AdminWorkspace } from "./useAdminWorkspace";

type OrganizationSettingsCardProps = Pick<
  AdminWorkspace,
  | "auth"
  | "overview"
  | "load"
  | "handleError"
  | "updateOrgFn"
  | "name"
  | "setName"
  | "type"
  | "setType"
  | "plan"
  | "setPlan"
  | "seatLimit"
  | "setSeatLimit"
  | "billingStatus"
  | "setBillingStatus"
>;

export function OrganizationSettingsCard({
  auth,
  overview,
  load,
  handleError,
  updateOrgFn,
  name,
  setName,
  type,
  setType,
  plan,
  setPlan,
  seatLimit,
  setSeatLimit,
  billingStatus,
  setBillingStatus,
}: OrganizationSettingsCardProps) {
  return (
    <SectionCard
      icon={<Settings className="size-5" />}
      title="Organization Settings"
      description="Manage organization details, plan information, seat limits, and billing status."
    >
      <form
        className="mt-5 grid gap-4"
        onSubmit={async (event: FormEvent) => {
          event.preventDefault();

          if (!auth.user || !overview?.organization?.id) return;

          try {
            await updateOrgFn({
              data: {
                actorUserId: auth.user.id,
                orgId: overview.organization.id,
                name,
                type,
                plan,
                seatLimit: Number(seatLimit),
                billingStatus,
              },
            });

            await load({ silent: true });
          } catch (caught) {
            handleError(caught, "Could not update organization");
          }
        }}
      >
        <div>
          <FieldLabel
            label="Organization name"
            help="Display name visible across workspace pages."
          />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Organization name"
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel
              label="Type"
              help="Organization category used for internal classification."
            />
            <Select
              value={type}
              onValueChange={(value) => value && setType(value)}
            >
              <SelectTrigger>
                <span>{type}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school">school</SelectItem>
                <SelectItem value="university">university</SelectItem>
                <SelectItem value="academy">academy</SelectItem>
                <SelectItem value="enterprise">enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel
              label="Plan tier"
              help="Subscription tier metadata used by admin settings."
            />
            <Select
              value={plan}
              onValueChange={(value) => value && setPlan(value)}
            >
              <SelectTrigger>
                <span>{plan}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">starter</SelectItem>
                <SelectItem value="growth">growth</SelectItem>
                <SelectItem value="pro">pro</SelectItem>
                <SelectItem value="enterprise">enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel
              label="Seat limit"
              help="Maximum active members allowed before new activations are blocked."
            />
            <Input
              value={seatLimit}
              onChange={(event) => setSeatLimit(event.target.value)}
              type="number"
              min={1}
              required
            />
          </div>
        </div>

        <div>
          <FieldLabel
            label="Billing status"
            help="Past due or canceled states can block assignments and invites."
          />
          <Select
            value={billingStatus}
            onValueChange={(value) =>
              setBillingStatus(value as BillingStatus)
            }
          >
            <SelectTrigger>
              <span>{billingStatus}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="past_due">past_due</SelectItem>
              <SelectItem value="canceled">canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" variant="outline">
          Save Settings
        </Button>
      </form>
    </SectionCard>
  );
}
