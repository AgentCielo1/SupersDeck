import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import type { NormalizedWorkOrder } from "@workorder/kit/contract";
import { statusLabel, priorityLabel } from "@workorder/kit/contract";

// =============================================================================
//  Server-rendered work-order PDF (vector, guaranteed one Letter page)
// =============================================================================
//  Mirrors the on-screen Resident Service Order sheet but as real PDF text —
//  no html2canvas rasterization, so no 2-page spill or borders bleeding into
//  text. Built from the shared NormalizedWorkOrder contract.
// =============================================================================

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function elapsed(s?: string, e?: string): string {
  if (!s || !e) return "";
  const a = new Date(s).getTime();
  const b = new Date(e).getTime();
  if (isNaN(a) || isNaN(b)) return "";
  return `${Math.round((b - a) / 60000)} min`;
}

const COLORS = { black: "#000000", gray: "#52525b", light: "#a1a1aa", line: "#a1a1aa" };

const st = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 40, fontSize: 9, color: COLORS.black, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: COLORS.black, paddingBottom: 8, marginBottom: 14 },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  orgSub: { fontSize: 7, color: COLORS.gray, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textTransform: "uppercase", textAlign: "right" },
  ref: { fontSize: 9, fontFamily: "Courier", textAlign: "right", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  cell: { width: "33.33%", paddingRight: 14, marginBottom: 7 },
  label: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: COLORS.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  value: { fontSize: 9, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingBottom: 3 },
  section: { marginBottom: 12 },
  sectionH: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: COLORS.black, paddingBottom: 4, marginBottom: 6 },
  title: { fontFamily: "Helvetica-Bold", marginBottom: 3, lineHeight: 1.3 },
  body: { lineHeight: 1.35 },
  orig: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.line, borderTopStyle: "dashed", paddingTop: 5 },
  origLabel: { fontSize: 7, color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  origText: { fontSize: 8, color: COLORS.gray, lineHeight: 1.3 },
  workArea: { minHeight: 64 },
  times: { flexDirection: "row", marginTop: 2, marginBottom: 18 },
  timeCell: { width: "33.33%", paddingRight: 14 },
  timeVal: { fontSize: 9, minHeight: 13, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingBottom: 3 },
  sigRow: { flexDirection: "row", marginBottom: 16 },
  sigMain: { flex: 1, paddingRight: 28 },
  sigDate: { width: 120 },
  sigLine: { height: 28, borderBottomWidth: 1, borderBottomColor: COLORS.black, justifyContent: "flex-end", flexDirection: "row", alignItems: "flex-end" },
  sigVal: { fontSize: 9 },
  sigImg: { height: 24, marginBottom: 1 },
  sigLabel: { fontSize: 7, color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 3 },
});

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.cell}>
      <Text style={st.label}>{label}</Text>
      <Text style={st.value}>{value}</Text>
    </View>
  );
}

function WorkOrderPdfDoc({ wo }: { wo: NormalizedWorkOrder }) {
  const sig = wo.completion?.signatureDataUrl;

  // Auto-condense to a single page: the only variable-height content is the
  // complaint + work-performed text, so scale the body font down as that grows
  // and shrink the reserved write-in space. `wrap={false}` is the backstop so
  // react-pdf never spills onto a second page.
  const longLen =
    (wo.description?.length ?? 0) +
    (wo.completion?.notes?.length ?? 0) +
    (wo.original?.description?.length ?? 0) +
    (wo.original?.title?.length ?? 0);
  const f =
    longLen > 2400 ? 0.65 : longLen > 1600 ? 0.75 : longLen > 900 ? 0.85 : 1;
  const bodyFont = { fontSize: 9 * f, lineHeight: 1.3 };
  const reserve = longLen > 700 ? 16 : 64; // blank write-in space when notes are short

  return (
    <Document title={`Work order ${wo.referenceNumber}`}>
      <Page size="LETTER" style={st.page}>
       <View wrap={false}>
        <View style={st.header}>
          <View>
            <Text style={st.orgName}>{wo.org.name}</Text>
            {wo.org.subtitle ? <Text style={st.orgSub}>{wo.org.subtitle}</Text> : null}
          </View>
          <View>
            <Text style={st.docTitle}>Resident Service Order</Text>
            <Text style={st.ref}>{wo.referenceNumber}</Text>
          </View>
        </View>

        <View style={st.grid}>
          <Meta label="Date" value={fmtDate(wo.createdAt)} />
          <Meta label="Taken by" value={wo.takenBy ?? "—"} />
          <Meta label="Status" value={statusLabel(wo.status)} />
          <Meta label="Resident" value={wo.reporter.name || "—"} />
          <Meta label="Phone" value={wo.reporter.phone ?? "—"} />
          <Meta label="Priority" value={priorityLabel(wo.priority)} />
          <Meta label="Address" value={wo.location.address ?? "—"} />
          <Meta label="Building" value={wo.location.buildingName || "—"} />
          <Meta label="Apartment" value={wo.location.unitLabel ?? "—"} />
          <Meta label="Location" value={wo.location.zone ?? "—"} />
          <Meta label="Category" value={wo.category?.label ?? "—"} />
        </View>

        <View style={st.section}>
          <Text style={st.sectionH}>Complaint / Request</Text>
          <Text style={[st.title, bodyFont]}>{wo.title}</Text>
          {wo.description ? <Text style={[st.body, bodyFont]}>{wo.description}</Text> : null}
          {wo.original ? (
            <View style={st.orig}>
              <Text style={st.origLabel}>As submitted ({wo.original.language})</Text>
              <Text style={[st.origText, { fontFamily: "Helvetica-Bold" }]}>{wo.original.title}</Text>
              {wo.original.description ? <Text style={st.origText}>{wo.original.description}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={st.section}>
          <Text style={st.sectionH}>Work Performed / Completion Notes</Text>
          <View style={[st.workArea, { minHeight: reserve }]}>
            <Text style={[st.body, bodyFont]}>{wo.completion?.notes ?? ""}</Text>
          </View>
        </View>

        <View style={st.times}>
          <View style={st.timeCell}>
            <Text style={st.label}>Time started</Text>
            <Text style={st.timeVal}>{fmtTime(wo.completion?.startedAt)}</Text>
          </View>
          <View style={st.timeCell}>
            <Text style={st.label}>Time stopped</Text>
            <Text style={st.timeVal}>{fmtTime(wo.completion?.completedAt)}</Text>
          </View>
          <View style={st.timeCell}>
            <Text style={st.label}>Elapsed</Text>
            <Text style={st.timeVal}>{elapsed(wo.completion?.startedAt, wo.completion?.completedAt)}</Text>
          </View>
        </View>

        <View style={st.sigRow}>
          <View style={st.sigMain}>
            <View style={st.sigLine}>
              {/* This <Image> is @react-pdf/renderer's PDF primitive, not next/image
                  or a DOM <img> — it has no `alt` prop. next/core-web-vitals maps all
                  <Image> to next/image for alt-text, a false positive here. */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {sig ? <Image src={sig} style={st.sigImg} /> : null}
            </View>
            <Text style={st.sigLabel}>
              Resident signature{wo.completion?.signedByName ? ` — ${wo.completion.signedByName}` : ""}
            </Text>
          </View>
          <View style={st.sigDate}>
            <View style={st.sigLine}>
              <Text style={st.sigVal}>{wo.completion?.signedAt ? fmtDate(wo.completion.signedAt) : ""}</Text>
            </View>
            <Text style={st.sigLabel}>Date</Text>
          </View>
        </View>

        <View style={st.sigRow}>
          <View style={st.sigMain}>
            <View style={st.sigLine}>
              <Text style={st.sigVal}>{wo.completion?.doneBy ?? ""}</Text>
            </View>
            <Text style={st.sigLabel}>Work done by</Text>
          </View>
          <View style={st.sigDate}>
            <View style={st.sigLine}>
              <Text style={st.sigVal}>{wo.completion?.completedAt ? fmtDate(wo.completion.completedAt) : ""}</Text>
            </View>
            <Text style={st.sigLabel}>Date</Text>
          </View>
        </View>
       </View>
      </Page>
    </Document>
  );
}

export async function renderWorkOrderPdf(wo: NormalizedWorkOrder): Promise<Buffer> {
  const stream = await renderToStream(<WorkOrderPdfDoc wo={wo} />);
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
