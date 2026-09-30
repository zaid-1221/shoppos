import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowDownLeft, ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, FileText, Landmark, Pencil, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CurrencyInput, DateRangePicker, EmptyState, Field, PageHeader, SimpleSelect, StatCard, StatusBadge } from "@/components/shared";
import { accountStats, actions, useDB } from "@/lib/store";
import { fmtDate, fmtDateTime, inRange, pageHead, rs, type Range } from "@/lib/format";
import { exportTablePdf } from "@/lib/pdf";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/accounts/$id")({
  head: pageHead("Account Details", "Account profile, balance and transaction ledger."),
  component: AccountDetail,
});

const LEDGER_PAGE_SIZE = 10;

type Form = {
  name: string;
  type: AccountType;
  accountNumber: string;
  phone: string;
  openingBalance: number;
  notes: string;
  active: boolean;
};

function AccountDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const account = db.accounts.find((a) => a.id === id);
  const [edit, setEdit] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [page, setPage] = useState(0);
  const [range, setRange] = useState<Range>({ from: "", to: "" });
  const [balanceDialog, setBalanceDialog] = useState<"add" | "edit" | null>(null);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [balanceError, setBalanceError] = useState("");

  useEffect(() => setPage(0), [id, range.from, range.to]);

  if (!account) {
    return (
      <Card>
        <EmptyState
          error
          title="Account not found."
          description="It may have been removed."
          action={<Button asChild variant="outline"><Link to="/accounts">Back to accounts</Link></Button>}
        />
      </Card>
    );
  }

  const stats = accountStats(db, account.id);
  const ledger = stats.ledger.filter((e) => inRange(e.date, range));
  const inflow = ledger.reduce((a, e) => a + e.inflow, 0);
  const outflow = ledger.reduce((a, e) => a + e.outflow, 0);
  const balance = stats.opening + inflow - outflow;
  const pages = Math.max(1, Math.ceil(ledger.length / LEDGER_PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const view = ledger.slice(safePage * LEDGER_PAGE_SIZE, safePage * LEDGER_PAGE_SIZE + LEDGER_PAGE_SIZE);

  const rangeLabel =
    range.from || range.to
      ? `${range.from ? fmtDate(range.from) : "…"} → ${range.to ? fmtDate(range.to) : "…"}`
      : "All time";

  const downloadPdf = () => {
    exportTablePdf({
      filename: `${account.name.replace(/\s+/g, "-").toLowerCase()}-ledger.pdf`,
      title: `Account Ledger — ${account.name}`,
      shopName: db.settings.shop.name,
      subtitle: `${account.type} · ${rangeLabel}`,
      columns: [
        { key: "date", header: "Date", width: 40 },
        { key: "kind", header: "Type", width: 28 },
        { key: "reference", header: "Reference", width: 28 },
        { key: "note", header: "Note", width: 40 },
        { key: "in", header: "In", align: "right", width: 28 },
        { key: "out", header: "Out", align: "right", width: 28 },
      ],
      rows: ledger.map((e) => ({
        date: e.editedAt ? `${fmtDateTime(e.date)} (edited ${fmtDateTime(e.editedAt)})` : fmtDateTime(e.date),
        kind: e.kind,
        reference: e.reference,
        note: e.note || "—",
        in: e.inflow ? rs(e.inflow) : "—",
        out: e.outflow ? rs(e.outflow) : "—",
      })),
      summary: stats.isCredit
        ? [
            { label: "Receivables", value: rs(stats.receivables) },
            { label: "Opening", value: rs(stats.opening) },
            { label: "Movements", value: String(ledger.length) },
          ]
        : [
            { label: "Opening", value: rs(stats.opening) },
            { label: "In", value: rs(inflow) },
            { label: "Out", value: rs(outflow) },
            { label: "Balance", value: rs(balance) },
          ],
    });
  };

  const validate = (f: Form) => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!f.name.trim()) e.name = "Name is required.";
    if (f.openingBalance < 0) e.openingBalance = "Opening balance cannot be negative.";
    return e;
  };

  const save = () => {
    if (!edit) return;
    const e = validate(edit);
    setErrors(e);
    if (Object.keys(e).length) return;
    actions.saveAccount({ ...edit, id: account.id });
    toast.success("Account updated.");
    setEdit(null);
  };

  const openEdit = () => {
    setEdit({
      name: account.name,
      type: account.type,
      accountNumber: account.accountNumber,
      phone: account.phone,
      openingBalance: account.openingBalance,
      notes: account.notes,
      active: account.active,
    });
    setErrors({});
  };

  const openBalance = (mode: "add" | "edit") => {
    setBalanceDialog(mode);
    setBalanceAmount(mode === "edit" ? account.openingBalance : 0);
    setBalanceError("");
  };

  const saveBalance = () => {
    if (!balanceDialog) return;
    if (balanceDialog === "add") {
      if (balanceAmount <= 0) {
        setBalanceError("Enter an amount greater than zero.");
        return;
      }
      const result = actions.addAccountBalance(account.id, balanceAmount);
      if (result === "ok") toast.success(`Added ${rs(balanceAmount)}.`);
      else toast.error("Could not add balance.");
    } else {
      if (balanceAmount < 0) {
        setBalanceError("Opening balance cannot be negative.");
        return;
      }
      const result = actions.setOpeningBalance(account.id, balanceAmount);
      if (result === "ok") toast.success("Opening balance updated.");
      else toast.error("Could not update opening balance.");
    }
    setBalanceDialog(null);
    setBalanceError("");
  };

  const statsRow = stats.isCredit ? (
    <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Receivables" value={rs(stats.receivables)} icon={AlertCircle} tone={stats.receivables ? "warning" : "default"} compact />
      <StatCard label="Opening" value={rs(stats.opening)} icon={Landmark} compact />
      <StatCard label="Movements" value={ledger.length} icon={Wallet} tone="info" compact />
    </div>
  ) : (
    <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Opening" value={rs(stats.opening)} icon={Landmark} compact />
      <StatCard label="In" value={rs(inflow)} icon={ArrowDownLeft} tone="success" compact />
      <StatCard label="Out" value={rs(outflow)} icon={ArrowUpRight} tone="destructive" compact />
      <StatCard label="Balance" value={rs(balance)} icon={Wallet} tone="info" compact />
    </div>
  );

  return (
    <div>
      <PageHeader
        title={account.name}
        description={`${account.type} account`}
        titleAside={statsRow}
        back={<Button variant="outline" asChild><Link to="/accounts"><ArrowLeft className="size-4" />Back</Link></Button>}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Button variant="outline" onClick={() => openBalance("add")}><Plus className="size-4" />Add Balance</Button>
            <Button variant="outline" onClick={() => openBalance("edit")}><Pencil className="size-4" />Edit Opening</Button>
            <Button variant="outline" onClick={openEdit}><Pencil className="size-4" />Edit Account</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit shadow-none">
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Account information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Type</span><span>{account.type}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Status</span><StatusBadge status={account.active ? "Active" : "Inactive"} /></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Account # / IBAN</span><span className="max-w-[60%] text-right break-all">{account.accountNumber || "—"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span>{account.phone || "—"}</span></div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Opening balance</span>
              <span className="flex items-center gap-2">
                {rs(account.openingBalance)}
                {account.openingBalanceEdited ? <StatusBadge status="Edited" /> : null}
              </span>
            </div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Notes</span><span className="max-w-[60%] text-right">{account.notes || "—"}</span></div>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
            <CardTitle className="text-base">Transaction ledger</CardTitle>
            <Button variant="outline" size="sm" onClick={downloadPdf}><FileText className="size-4" />PDF</Button>
          </CardHeader>
          {ledger.length === 0 ? (
            <EmptyState
              title={stats.ledger.length === 0 ? "No movements yet." : "No movements in this range."}
              description={stats.ledger.length === 0 ? "Payments, expenses and refunds for this account will appear here." : "Try another date range."}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">In</TableHead>
                      <TableHead className="pr-4 text-right">Out</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {view.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="pl-4 whitespace-nowrap">
                          <div>
                            <p>{fmtDateTime(e.date)}</p>
                            {e.editedAt && (
                              <p className="text-xs text-muted-foreground">Edited {fmtDateTime(e.editedAt)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{e.kind}</span>
                            {e.openingAdj && e.editedAt ? <StatusBadge status="Edited" className="text-[10px]" /> : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-primary">{e.reference}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground" title={e.note || undefined}>{e.note || "—"}</TableCell>
                        <TableCell className="text-right text-emerald-700">{e.inflow ? rs(e.inflow) : "—"}</TableCell>
                        <TableCell className="pr-4 text-right text-destructive">{e.outflow ? rs(e.outflow) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {pages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                  <span>
                    Showing {safePage * LEDGER_PAGE_SIZE + 1}–{Math.min(ledger.length, (safePage + 1) * LEDGER_PAGE_SIZE)} of {ledger.length}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="size-8" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
                    <Button variant="outline" size="icon" className="size-8" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" error={errors.name} className="sm:col-span-2">
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </Field>
              <Field label="Type">
                <SimpleSelect value={edit.type} onChange={(v) => setEdit({ ...edit, type: v as AccountType })} options={[...ACCOUNT_TYPES]} />
              </Field>
              <Field label="Status">
                <SimpleSelect
                  value={edit.active ? "Active" : "Inactive"}
                  onChange={(v) => setEdit({ ...edit, active: v === "Active" })}
                  options={["Active", "Inactive"]}
                />
              </Field>
              <Field label="Account # / IBAN">
                <Input value={edit.accountNumber} onChange={(e) => setEdit({ ...edit, accountNumber: e.target.value })} />
              </Field>
              <Field label="Phone (wallet)">
                <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </Field>
              <Field label="Opening balance" error={errors.openingBalance} hint="Changing this marks opening as Edited." className="sm:col-span-2">
                <CurrencyInput value={edit.openingBalance} onChange={(n) => setEdit({ ...edit, openingBalance: n })} />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!balanceDialog} onOpenChange={(o) => { if (!o) { setBalanceDialog(null); setBalanceError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{balanceDialog === "add" ? "Add Balance" : "Edit Opening Balance"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {balanceDialog === "add"
                ? `Current opening: ${rs(account.openingBalance)}. Enter amount to add.`
                : `Current opening: ${rs(account.openingBalance)}. Set the new opening amount.`}
            </p>
            <Field
              label={balanceDialog === "add" ? "Amount to add" : "Opening balance"}
              error={balanceError || undefined}
            >
              <CurrencyInput autoFocus value={balanceAmount} onChange={setBalanceAmount} />
            </Field>
            {balanceDialog === "edit" && (
              <p className="text-xs text-muted-foreground">Saving a different amount will mark this opening as Edited.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBalanceDialog(null); setBalanceError(""); }}>Cancel</Button>
            <Button onClick={saveBalance}>{balanceDialog === "add" ? "Add Balance" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
