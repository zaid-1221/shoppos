import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Banknote, FileText, HandCoins, Pencil, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CurrencyInput, DateRangePicker, EmptyState, Field, PageHeader, SimpleSelect, StatCard, StatusBadge } from "@/components/shared";
import { actions, currentMonthKey, staffStats, useDB } from "@/lib/store";
import { fmtDate, fmtDateTime, inRange, pageHead, rs, toDateInput, type Range } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import { SALARY_TYPES, STAFF_ROLES, accountIdOf, salaryDueAmount, salaryFieldLabel, type SalaryType, type StaffRole, type StaffTxnKind } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_app/staff/$id")({
  head: pageHead("Staff Details", "Staff profile, salary payments and advances."),
  component: StaffDetail,
});

type Form = { name: string; phone: string; role: StaffRole; salary: number; salaryType: SalaryType; salaryCustom: string; status: "Active" | "Inactive"; address: string; notes: string };
type TxnForm = { kind: StaffTxnKind; amount: number; advanceCut: number; accountId: string; note: string; forMonth: string };

function formatStaffSalary(salary: number, salaryType: SalaryType = "Monthly", salaryCustom = "") {
  if (salaryType === "Custom") return salaryCustom.trim() || "—";
  const amount = rs(salary);
  if (salaryType === "Daily") return `${amount}/day`;
  return `${amount}/mo`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleString("en-PK", { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function thisMonthRange(): Range {
  const now = new Date();
  return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) };
}

function StaffDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const member = db.staff.find((s) => s.id === id);
  const [range, setRange] = useState<Range>(thisMonthRange);
  const [edit, setEdit] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [txn, setTxn] = useState<TxnForm | null>(null);
  const [txnErr, setTxnErr] = useState("");

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([currentMonthKey()]);
    db.staffTxns.filter((t) => t.staffId === id).forEach((t) => keys.add(t.forMonth));
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    keys.add(currentMonthKey(d));
    return [...keys].sort().reverse().map((k) => ({ value: k, label: monthLabel(k) }));
  }, [db.staffTxns, id]);

  if (!member) {
    return (
      <Card>
        <EmptyState
          error
          title="Staff not found."
          description="It may have been removed."
          action={<Button asChild variant="outline"><Link to="/staff">Back to staff</Link></Button>}
        />
      </Card>
    );
  }

  const all = staffStats(db, member.id);
  const rows = all.list.filter((t) => inRange(t.date, range));
  const paid = rows.filter((t) => t.kind === "Payment").reduce((a, t) => a + t.amount, 0);
  const advanceTaken = rows.filter((t) => t.kind === "Advance").reduce((a, t) => a + t.amount, 0);
  const advanceCutInRange = rows.filter((t) => t.kind === "AdvanceCut").reduce((a, t) => a + t.amount, 0);
  const monthStats = staffStats(db, member.id, currentMonthKey());
  const monthDue = salaryDueAmount(member, currentMonthKey());
  const remaining = monthStats.remaining;
  const unpaidAdvance = all.unpaidAdvance;
  const salaryType = member.salaryType ?? "Monthly";
  const isCustom = salaryType === "Custom";

  const downloadStatement = () => {
    exportTablePdf({
      filename: `${member.name.replace(/\s+/g, "-").toLowerCase()}-payroll.pdf`,
      title: `Staff Statement — ${member.name}`,
      shopName: db.settings.shop.name,
      subtitle: member.role,
      columns: [
        { key: "date", header: "Date", width: 40 },
        { key: "kind", header: "Type", width: 28 },
        { key: "method", header: "Method", width: 24 },
        { key: "note", header: "Note", width: 40 },
        { key: "amount", header: "Amount", align: "right", width: 28 },
      ],
      rows: rows.map((t) => ({
        date: fmtDateTime(t.date),
        kind: t.kind === "AdvanceCut" ? "Advance cut" : t.kind,
        method: t.kind === "AdvanceCut" ? "—" : t.method,
        note: t.note || "—",
        amount: rs(t.amount),
      })),
      summary: [
        { label: salaryFieldLabel(salaryType), value: formatStaffSalary(member.salary, salaryType, member.salaryCustom) },
        ...(!isCustom ? [{ label: "Due this month", value: rs(monthDue) }] : []),
        { label: "Paid (range)", value: rs(paid) },
        { label: "Advance taken (range)", value: rs(advanceTaken) },
        { label: "Advance cut (range)", value: rs(advanceCutInRange) },
        { label: "Unpaid advance", value: rs(unpaidAdvance) },
        ...(!isCustom ? [{ label: "Remaining salary", value: rs(remaining) }] : []),
      ],
    });
  };

  const validate = (f: Form) => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!f.name.trim()) e.name = "Name is required.";
    if (!f.phone.trim()) e.phone = "Phone is required.";
    if (f.salaryType === "Custom") {
      if (!f.salaryCustom.trim()) e.salaryCustom = "Write the salary details.";
    } else if (!f.salary || f.salary <= 0) {
      e.salary = `Enter a valid ${salaryFieldLabel(f.salaryType).toLowerCase()}.`;
    }
    return e;
  };

  const save = () => {
    if (!edit) return;
    const e = validate(edit);
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.saveStaff({
      ...edit,
      id: member.id,
      salary: edit.salaryType === "Custom" ? 0 : edit.salary,
      salaryCustom: edit.salaryType === "Custom" ? edit.salaryCustom.trim() : "",
    });
    toast.success("Staff updated.");
    setEdit(null);
  };

  const saveTxn = () => {
    if (!txn) return;
    if (txn.kind === "Advance") {
      if (txn.amount <= 0) return setTxnErr("Enter an amount greater than zero.");
      actions.recordStaffTxn({
        staffId: member.id,
        kind: "Advance",
        amount: txn.amount,
        accountId: txn.accountId,
        note: txn.note,
        forMonth: txn.forMonth,
      });
      toast.success(`Advance of ${rs(txn.amount)} recorded.`);
      setTxn(null);
      return;
    }

    const st = staffStats(db, member.id, txn.forMonth);
    if (txn.amount <= 0 && txn.advanceCut <= 0) return setTxnErr("Enter payment or advance cut amount.");
    if (txn.advanceCut > st.unpaidAdvance) return setTxnErr(`Advance cut cannot be more than unpaid (${rs(st.unpaidAdvance)}).`);
    if (!isCustom) {
      const settled = txn.amount + txn.advanceCut;
      if (settled > st.remaining) return setTxnErr(`Total cannot be more than remaining (${rs(st.remaining)}).`);
    }
    if (txn.amount > 0) {
      actions.recordStaffTxn({
        staffId: member.id,
        kind: "Payment",
        amount: txn.amount,
        accountId: txn.accountId,
        note: txn.note,
        forMonth: txn.forMonth,
      });
    }
    if (txn.advanceCut > 0) {
      actions.recordStaffTxn({
        staffId: member.id,
        kind: "AdvanceCut",
        amount: txn.advanceCut,
        accountId: txn.accountId,
        note: txn.note || "Advance cut from salary",
        forMonth: txn.forMonth,
      });
    }
    toast.success("Payment recorded.");
    setTxn(null);
  };

  const openEdit = () => {
    setEdit({
      name: member.name,
      phone: member.phone,
      role: member.role,
      salary: member.salary,
      salaryType: member.salaryType ?? "Monthly",
      salaryCustom: member.salaryCustom ?? "",
      status: member.status,
      address: member.address,
      notes: member.notes,
    });
    setErrors({});
  };

  return (
    <div>
      <PageHeader
        title={member.name}
        titleAside={<StatusBadge status={member.status} />}
        description={`${member.role} · Joined ${fmtDate(member.joinDate)}`}
        back={<Button variant="outline" asChild><Link to="/staff"><ArrowLeft className="size-4" />Back</Link></Button>}
        actions={
          <>
            <Button variant="outline" onClick={downloadStatement}><FileText className="size-4" />Statement PDF</Button>
            <Button variant="outline" onClick={openEdit}><Pencil className="size-4" />Edit</Button>
            <Button
              variant="outline"
              onClick={() => {
                setTxn({ kind: "Advance", amount: 0, advanceCut: 0, accountId: accountIdOf("Cash"), note: "", forMonth: currentMonthKey() });
                setTxnErr("");
              }}
            >
              <HandCoins className="size-4" />Give advance
            </Button>
            <Button
              onClick={() => {
                setTxn({ kind: "Payment", amount: isCustom ? 0 : monthStats.remaining, advanceCut: 0, accountId: accountIdOf("Cash"), note: "", forMonth: currentMonthKey() });
                setTxnErr("");
              }}
              disabled={!isCustom && monthStats.remaining <= 0 && unpaidAdvance <= 0}
            >
              <Banknote className="size-4" />Add payment
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <InfoRow label="Phone" value={member.phone} />
              <InfoRow label="Role" value={<StatusBadge status={member.role} />} />
              <InfoRow label="Status" value={<StatusBadge status={member.status} />} />
              <InfoRow label="Salary type" value={salaryType} />
              <InfoRow label={salaryFieldLabel(salaryType)} value={<span className="font-semibold">{formatStaffSalary(member.salary, salaryType, member.salaryCustom)}</span>} />
              <InfoRow label="Unpaid advance" value={<span className={cn("font-semibold", unpaidAdvance > 0 && "text-warning")}>{rs(unpaidAdvance)}</span>} />
              <InfoRow label="Joined" value={fmtDate(member.joinDate)} />
              <InfoRow label="Address" value={member.address || "—"} />
              {member.notes ? <InfoRow label="Notes" value={member.notes} /> : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Payroll</p>
              <p className="text-sm text-muted-foreground">Payments & advances for selected dates</p>
            </div>
            <DateRangePicker value={range} onChange={setRange} />
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Salary" value={formatStaffSalary(member.salary, salaryType, member.salaryCustom)} icon={Wallet} tone="info" compact />
            <StatCard label="Paid" value={rs(paid)} icon={Banknote} tone="success" compact />
            <StatCard label="Advance due" value={rs(unpaidAdvance)} icon={HandCoins} tone="warning" compact />
            {!isCustom && (
              <StatCard
                label="Remaining"
                value={<span className={cn(remaining > 0 && "text-warning")}>{rs(remaining)}</span>}
                icon={AlertCircle}
                tone={remaining ? "warning" : "success"}
                compact
              />
            )}
          </div>

          <Card className="gap-0 overflow-hidden py-0 shadow-none">
            {rows.length === 0 ? (
              <EmptyState title="No transactions in this range." description="Try another date range, or record a payment / advance." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="pr-5 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="pl-5 whitespace-nowrap">{fmtDateTime(t.date)}</TableCell>
                        <TableCell><StatusBadge status={t.kind} /></TableCell>
                        <TableCell>{t.kind === "AdvanceCut" ? "—" : t.method}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{t.note || "—"}</TableCell>
                        <TableCell className={cn(
                          "pr-5 text-right font-semibold",
                          t.kind === "Advance" && "text-warning",
                          t.kind === "AdvanceCut" && "text-info",
                        )}>
                          {rs(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Staff</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={errors.name} className="sm:col-span-2">
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </Field>
              <Field label="Role">
                <SimpleSelect value={edit.role} onChange={(v) => setEdit({ ...edit, role: v as StaffRole })} options={[...STAFF_ROLES]} />
              </Field>
              <Field label="Salary type">
                <SimpleSelect value={edit.salaryType} onChange={(v) => setEdit({ ...edit, salaryType: v as SalaryType })} options={[...SALARY_TYPES]} />
              </Field>
              {edit.salaryType === "Custom" ? (
                <Field label="Salary details" error={errors.salaryCustom} className="sm:col-span-2">
                  <Input
                    placeholder="e.g. Commission 5%, week me 3000, piece rate…"
                    value={edit.salaryCustom}
                    onChange={(e) => setEdit({ ...edit, salaryCustom: e.target.value })}
                  />
                </Field>
              ) : (
                <Field label={salaryFieldLabel(edit.salaryType)} error={errors.salary}>
                  <CurrencyInput value={edit.salary} onChange={(n) => setEdit({ ...edit, salary: n })} />
                </Field>
              )}
              <Field label="Status">
                <SimpleSelect value={edit.status} onChange={(v) => setEdit({ ...edit, status: v as "Active" | "Inactive" })} options={["Active", "Inactive"]} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!txn} onOpenChange={(o) => !o && setTxn(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{txn?.kind === "Advance" ? "Give advance" : "Add payment"}</DialogTitle>
          </DialogHeader>
          {txn && (
            <div className="space-y-3">
              <Field label="Month">
                <SimpleSelect value={txn.forMonth} onChange={(v) => setTxn({ ...txn, forMonth: v, advanceCut: 0 })} options={monthOptions} />
              </Field>
              {txn.kind === "Payment" && !isCustom && (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  Remaining salary: <span className="font-semibold">{rs(staffStats(db, member.id, txn.forMonth).remaining)}</span>
                </p>
              )}
              {txn.kind === "Payment" && unpaidAdvance > 0 && (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  Unpaid advance: <span className="font-semibold">{rs(unpaidAdvance)}</span>
                </p>
              )}
              {isCustom && member.salaryCustom?.trim() ? (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  Salary: <span className="font-semibold">{member.salaryCustom.trim()}</span>
                </p>
              ) : null}
              <Field label={txn.kind === "Advance" ? "Advance amount" : "Cash payment"} error={txnErr}>
                <CurrencyInput autoFocus value={txn.amount} onChange={(n) => { setTxn({ ...txn, amount: n }); setTxnErr(""); }} />
              </Field>
              {txn.kind === "Payment" && unpaidAdvance > 0 && (
                <Field label="Cut advance (optional)">
                  <CurrencyInput value={txn.advanceCut} onChange={(n) => { setTxn({ ...txn, advanceCut: n }); setTxnErr(""); }} />
                </Field>
              )}
              <Field label="Account">
                <SimpleSelect
                  value={txn.accountId}
                  onChange={(v) => setTxn({ ...txn, accountId: v })}
                  options={db.accounts.filter((a) => a.active && a.type !== "Credit").map((a) => ({ value: a.id, label: a.name }))}
                />
              </Field>
              <Field label="Note (optional)">
                <Input value={txn.note} onChange={(e) => setTxn({ ...txn, note: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxn(null)}>Cancel</Button>
            <Button onClick={saveTxn}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
