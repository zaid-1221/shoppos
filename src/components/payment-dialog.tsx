import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CurrencyInput, Field, SimpleSelect } from "@/components/shared";
import { accountIdOf } from "@/lib/mock-data";
import { useDB } from "@/lib/store";
import { rs } from "@/lib/format";

export function PaymentDialog({
  open,
  onOpenChange,
  title,
  due,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  due: number;
  onSubmit: (amount: number, accountId: string) => void;
}) {
  const db = useDB();
  const options = useMemo(
    () => db.accounts.filter((a) => a.active && a.type !== "Credit").map((a) => ({ value: a.id, label: a.name })),
    [db.accounts],
  );
  const defaultId = options[0]?.value ?? accountIdOf("Cash");
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState(defaultId);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(due);
      setErr("");
      setAccountId(options[0]?.value ?? accountIdOf("Cash"));
    }
  }, [open, due, options]);

  const submit = () => {
    if (amount <= 0) return setErr("Enter an amount greater than zero.");
    if (amount > due) return setErr(`Amount cannot be more than the due balance (${rs(due)}).`);
    onSubmit(amount, accountId);
    toast.success(`Payment of ${rs(amount)} recorded.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Outstanding balance: <b>{rs(due)}</b>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Amount" error={err}>
            <CurrencyInput autoFocus value={amount} onChange={(n) => { setAmount(n); setErr(""); }} />
          </Field>
          <Field label="Account">
            <SimpleSelect value={accountId} onChange={setAccountId} options={options} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
