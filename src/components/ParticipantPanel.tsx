import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiParticipant } from "../../shared/api-types";
import type { ParticipantInput } from "../../shared/schemas";
import { Field } from "./ui";

const participantFormSchema = z.object({
  name: z.string().trim().min(1, "Nhap ten nguoi tham gia"),
  bankId: z.string().trim(),
  accountNo: z.string().trim(),
  accountName: z.string().trim(),
});

type ParticipantFormValues = z.infer<typeof participantFormSchema>;

const emptyForm: ParticipantFormValues = {
  name: "",
  bankId: "",
  accountNo: "",
  accountName: "",
};

type ParticipantPanelProps = {
  participants: ApiParticipant[];
  pending: boolean;
  onAdd: (input: ParticipantInput) => Promise<unknown>;
  onRemove: (participantId: string) => void;
};

export function ParticipantPanel({ participants, pending, onAdd, onRemove }: ParticipantPanelProps) {
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: emptyForm,
  });

  const handleAdd = form.handleSubmit(async (values) => {
    await onAdd(values);
    form.reset(emptyForm);
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-emerald-700" />
        <h3 className="text-lg font-semibold text-stone-950">Nguoi tham gia</h3>
      </div>

      <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-2">
        <Field label="Ten" error={form.formState.errors.name?.message}>
          <input {...form.register("name")} className="field" placeholder="Huy" />
        </Field>
        <Field label="Ma ngan hang">
          <input {...form.register("bankId")} className="field" placeholder="VCB, TCB, MBB..." />
        </Field>
        <Field label="So tai khoan">
          <input {...form.register("accountNo")} className="field" placeholder="0123456789" />
        </Field>
        <Field label="Ten chu tai khoan">
          <input {...form.register("accountName")} className="field" placeholder="NGUYEN VAN A" />
        </Field>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Plus size={17} />
            Them nguoi
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {participants.map((participant) => (
          <div key={participant.id} className="rounded-md border border-stone-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-950">{participant.name}</p>
                <p className="mt-1 truncate text-xs text-stone-500">
                  {participant.bankId && participant.accountNo
                    ? `${participant.bankId} - ${participant.accountNo}`
                    : "Chua co thong tin QR"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(participant.id)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                aria-label={`Xoa ${participant.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
