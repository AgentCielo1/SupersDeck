-- =============================================================================
-- SupersDeck — EVIDENCE RESEARCH: which open HPD violations already have work?
-- =============================================================================
-- READ-ONLY (the temp table vanishes when your SQL-editor session ends; no app
-- table is touched). Cross-references all 178 open HPD violations
-- (export of 2026-09-24) against every work order and archived document in
-- the system, matching on building + apartment + issue keywords.
--
-- Run each SELECT below in the Supabase SQL editor and download the results
-- as CSV (Results panel → Download). Give the CSVs to Claude to build the
-- evidence dossier for HPD certification / dismissal.
-- =============================================================================

create temp table if not exists v_open (
  violationid text, building text, apt text, cls text, issued date,
  hpd_status text, category text, kw text, gist text
);
truncate v_open;
insert into v_open values
  ('19163379', 'Building 1', '10K', 'C', '2026-08-26', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('19104618', 'Building 1', '10K', 'B', '2026-08-20', 'NOV SENT OUT', 'other', 'vent', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE MECHANICAL VENT IN THE B'),
  ('19104619', 'Building 1', '10K', 'B', '2026-08-20', 'NOV SENT OUT', 'other', 'window', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE CRACKED WINDOW PANE- UPP'),
  ('19126953', 'Building 1', null, 'A', '2026-08-10', 'NOV SENT OUT', 'other', 'other', '§27-2104(B) HMC POST A PROPER NOTICE REGARDING RENT STABILIZATION LAW, IN A FORM APPROVED '),
  ('19126952', 'Building 1', '11D', 'B', '2026-08-10', 'NOV SENT OUT', 'leak', 'faucet|sink|basin|shower|bathtub|tub|toilet', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE TOILET SEAT AT WATER CLOSET IN THE BATHROOM L'),
  ('18912980', 'Building 1', null, 'A', '2026-05-13', 'NOV SENT OUT', 'other', 'other', '§27-2104(B) HMC POST A PROPER NOTICE REGARDING RENT STABILIZATION LAW, IN A FORM APPROVED '),
  ('18803443', 'Building 1', '1K', 'C', '2026-04-22', 'NOV SENT OUT', 'no-hot-water', 'hot water', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOC'),
  ('18803444', 'Building 1', '1L', 'C', '2026-04-22', 'NOV SENT OUT', 'no-hot-water', 'hot water', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOC'),
  ('18803446', 'Building 1', '1G', 'C', '2026-04-22', 'NOV SENT OUT', 'no-hot-water', 'hot water', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOC'),
  ('18803447', 'Building 1', '3A', 'C', '2026-04-22', 'NOV SENT OUT', 'no-hot-water', 'hot water', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOC'),
  ('18803440', 'Building 1', '1M', 'C', '2026-04-22', 'NOV SENT OUT', 'no-hot-water', 'hot water', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE ENTIRE APARTMENT LOC'),
  ('18694658', 'Building 1', '4A', 'B', '2026-03-10', 'NOV SENT OUT', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC T'),
  ('18667868', 'Building 1', '11F', 'C', '2026-02-26', 'NOV SENT OUT', 'other', 'door', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('18667872', 'Building 1', null, 'B', '2026-02-26', 'NOV SENT OUT', 'lock-key', 'lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY BY MEANS OF AN ACCEPTABLE MECHANICAL HEAVY DUTY LOCK A'),
  ('18667870', 'Building 1', '12G', 'B', '2026-02-26', 'NOV SENT OUT', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2045(B)(1)(B) HMC, § 12-06, § 12-07, § 12-09 RCNY REPAIR, REPLACE OR PROVIDE AN APPRO'),
  ('18667875', 'Building 1', null, 'C', '2026-02-26', 'NOV SENT OUT', 'lock-key', 'lock|key|fob', '§ 27-2033 ADM CODE POST NOTICE, IN FORM APPROVED BY THE DEPARTMENT, STATING THE NAME AND L'),
  ('18667874', 'Building 1', null, 'B', '2026-02-26', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTAB'),
  ('18667873', 'Building 1', null, 'C', '2026-02-26', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING'),
  ('18667871', 'Building 1', null, 'C', '2026-02-26', 'NOV SENT OUT', 'other', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING'),
  ('18667867', 'Building 1', null, 'C', '2026-02-26', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2033 ADM CODE PROVIDE READY ACCESS TO BUILDINGS HEATING SYSTEM DOOR LOCKED AT CELLAR '),
  ('18653970', 'Building 1', null, 'B', '2026-02-19', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF POWER OUTAGE BY MEANS OF AN ACCEPTABLE'),
  ('18653971', 'Building 1', null, 'C', '2026-02-19', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING UNACCEPTABLE ELECTROMAGNETIC LOCKING'),
  ('18629047', 'Building 1', '1A', 'B', '2026-02-10', 'NOV SENT OUT', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2045(B)(1)(B) HMC, § 12-06, § 12-07, § 12-09 RCNY REPAIR, REPLACE OR PROVIDE AN APPRO'),
  ('18629048', 'Building 1', '1A', 'B', '2026-02-10', 'NOV SENT OUT', 'other', 'smoke', '§ 27-2045(B)(1)(A) HMC, § 12-01, § 12-03 RCNY REPAIR, REPLACE OR PROVIDE AN APPROVED AND O'),
  ('18629046', 'Building 1', '1A', 'C', '2026-02-10', 'NOV SENT OUT', 'other', 'door', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('18629045', 'Building 1', '1A', 'C', '2026-02-10', 'NOV SENT OUT', 'other', 'vent|door', '§ 27-2005, 2007 ADM CODE REMOVE DEVICE PREVENTING DOOR FROM BEING SELF-CLOSING WEATHERSTRI'),
  ('18629042', 'Building 1', null, 'C', '2026-02-10', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTR'),
  ('18629043', 'Building 1', null, 'B', '2026-02-10', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTAB'),
  ('18629044', 'Building 1', '1A', 'B', '2026-02-10', 'NOV SENT OUT', 'other', 'door', '§ 27-2005 HMC: REFIT DOOR AND FRAME RUBBING AT DOOR IN THE ENTRANCE LOCATED AT APT 1A, 1s'),
  ('18362239', 'Building 1', null, 'B', '2025-11-12', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTAB'),
  ('18362238', 'Building 1', null, 'C', '2025-11-12', 'NOV SENT OUT', 'other', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMA'),
  ('18225138', 'Building 1', '10K', 'C', '2025-09-15', 'NOV SENT OUT', 'other', 'window', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE GLASS PANE AT UPPER SASH'),
  ('18225131', 'Building 1', '10K', 'B', '2025-09-15', 'DEFECT LETTER ISSUED', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... GREAT'),
  ('18225132', 'Building 1', '10K', 'B', '2025-09-15', 'NOV SENT OUT', 'leak', 'leak|water damage|drip', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT '),
  ('18225133', 'Building 1', '10K', 'B', '2025-09-15', 'NOV SENT OUT', 'other', 'door', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE DOOR AT ENTRANCE IN THE '),
  ('18225134', 'Building 1', '10K', 'C', '2025-09-15', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('18225135', 'Building 1', '10K', 'B', '2025-09-15', 'NOV SENT OUT', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC F'),
  ('18225136', 'Building 1', '10K', 'B', '2025-09-15', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('18225137', 'Building 1', '10K', 'B', '2025-09-15', 'NOV SENT OUT', 'other', 'vent', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE MECHANICAL VENTILATION S'),
  ('17433894', 'Building 1', '12A', 'B', '2024-11-25', 'NOV SENT OUT', 'other', 'smoke', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT '),
  ('17433896', 'Building 1', null, 'C', '2024-11-25', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTRO M'),
  ('17433897', 'Building 1', null, 'B', '2024-11-25', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTAB'),
  ('17433895', 'Building 1', '12A', 'C', '2024-11-25', 'NOV SENT OUT', 'other', 'vent|door', '§ 27-2005, 2007 ADM CODE REMOVE DEVICE PREVENTING DOOR FROM BEING SELF-CLOSING DOOR SWEEPE'),
  ('17433893', 'Building 1', '12A', 'B', '2024-11-25', 'NOV SENT OUT', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN T'),
  ('17368784', 'Building 1', '3A', 'B', '2024-10-31', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('17368756', 'Building 1', '6A', 'C', '2024-10-31', 'NOV SENT OUT', 'lock-key', 'lock|key|fob|door', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LOCK AND ASSEMBLY AT DOO'),
  ('17391383', 'Building 1', null, 'B', '2024-10-31', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF POWER OUTAGE BY MEANS OF AN ACCEPTABLE'),
  ('17368788', 'Building 1', '3A', 'B', '2024-10-31', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('17391374', 'Building 1', null, 'C', '2024-10-31', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTR'),
  ('17368767', 'Building 1', '4A', 'B', '2024-10-31', 'NOV SENT OUT', 'appliance', 'stove|range|gas|oven', '§ 27-2070 ADM CODE PROVIDE AN ADEQUATE SUPPLY OF GAS TO THE FIXTURES AT RANGE IN THE KITCH'),
  ('17317498', 'Building 1', '12K', 'C', '2024-10-03', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('17317500', 'Building 1', '12K', 'B', '2024-10-03', 'NOV SENT OUT', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). MISSING IN THE'),
  ('17317499', 'Building 1', '12K', 'B', '2024-10-03', 'NOV SENT OUT', 'other', 'smoke', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR MISSING IN THE ENTIRE APARTMENT LO'),
  ('17317502', 'Building 1', '12L', 'C', '2024-10-03', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('17317501', 'Building 1', '12L', 'C', '2024-10-03', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('17291693', 'Building 1', null, 'B', '2024-09-23', 'NOV SENT OUT', 'common-area', 'refuse|rubbish|garbage|trash', '§ 27-2010, 2011, 2012 ADM CODE REMOVE THE ACCUMULATION OF REFUSE AND/OR RUBBISH AND MAINTA'),
  ('17276472', 'Building 1', null, 'B', '2024-09-17', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob', '§ 27-2005 ADM CODE PROVIDE SECURITY IN EVENT OF POWER OUTAGE BY MEANS OF AN MECHANICAL HEA'),
  ('17276470', 'Building 1', '11B', 'B', '2024-09-17', 'NOV SENT OUT', 'other', 'door', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH ON APARTMENT DOOR '),
  ('17276471', 'Building 1', null, 'C', '2024-09-17', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING ON UNACCETBLE ELECTROMANA'),
  ('17243859', 'Building 1', null, 'B', '2024-09-05', 'NOV SENT OUT', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTAB'),
  ('17243854', 'Building 1', '11B', 'C', '2024-09-05', 'NOV SENT OUT', 'other', 'door', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('17243855', 'Building 1', '11B', 'B', '2024-09-05', 'NOV SENT OUT', 'other', 'other', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH SET IN THE ENTRANC'),
  ('17243856', 'Building 1', '11B', 'B', '2024-09-05', 'NOV SENT OUT', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN T'),
  ('17243857', 'Building 1', '11B', 'B', '2024-09-05', 'NOV SENT OUT', 'other', 'smoke', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT '),
  ('17243858', 'Building 1', null, 'C', '2024-09-05', 'NOV SENT OUT', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMA'),
  ('17243853', 'Building 1', '11B', 'B', '2024-09-05', 'NOV SENT OUT', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE WOOD FLOO'),
  ('17065801', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('17065799', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('17065798', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE VINYL FLO'),
  ('17065806', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'electrical', 'electric|outlet|light|wiring', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LIGHT FIXTURE AT WEST WA'),
  ('17065807', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'door', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE SLIDING CLOSET DOOR IN T'),
  ('17065808', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE VINYL FLO'),
  ('17065802', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'leak', 'leak|water damage|drip|faucet|sink|basin|shower|bathtub|tub|toilet', '§ 27-2026 ADM CODE REPAIR THE LEAKY AND/OR DEFECTIVE FAUCETS WASH BASIN IN THE BATHROOM LO'),
  ('17065804', 'Building 1', '8B', 'C', '2024-06-24', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('17065805', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'window', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE WINDOW UPPER SASH COUNTE'),
  ('17065803', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'faucet|sink|basin|shower|bathtub|tub|toilet', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE SINK AT NORTH WALL IN THE KITCHEN LOCATED AT '),
  ('17065800', 'Building 1', '8B', 'B', '2024-06-24', 'NOV SENT OUT', 'other', 'door', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE HINGES AT CLOSET DOOR IN'),
  ('16943676', 'Building 1', '12L', 'C', '2024-05-03', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('16943675', 'Building 1', '12L', 'C', '2024-05-03', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('16940293', 'Building 1', '12L', 'C', '2024-05-02', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPRO'),
  ('16917555', 'Building 1', null, 'C', '2024-04-25', 'NOT COMPLIED WITH', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF UNACCEPTABLE ELECTROMA'),
  ('16881024', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'other', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE BASEBOARD'),
  ('16881034', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'leak', 'faucet|sink|basin|shower|bathtub|tub|toilet', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE WASH BASIN AT NORTH WALL IN THE BATHROOM LOCA'),
  ('16881033', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPRO'),
  ('16881035', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE BASE BOARD AT FLOOR IN THE BATHROOM LOCATED A'),
  ('16881032', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'door|cabinet', '§ 27-2005 HMC: REFIT DOORS AT NORTH AND SOUTH UPPER WALL CABINETS IN THE KITCHEN LOCATED '),
  ('16881031', 'Building 1', '12L', 'C', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'door', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('16881028', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'electrical', 'electric|outlet|light|wiring', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE ELECTRICAL OUTLET AT SOU'),
  ('16881037', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('16912918', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'door|cabinet', '§ 27-2005 HMC: REFIT DOOR AT NORTH WALL BASE CABINET IN THE KITCHEN LOCATED AT APT 12L, 1'),
  ('16881036', 'Building 1', '12L', 'B', '2024-04-18', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('16881025', 'Building 1', '12L', 'B', '2024-04-17', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('16881026', 'Building 1', '12L', 'B', '2024-04-17', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'leak', 'leak|water damage|drip', '§ 27-2005 ADM CODE REPAIR THE ROOF SO THAT IT WILL NOT LEAK OVER CEILING IN THE 2nd ROOM F'),
  ('16881027', 'Building 1', '12L', 'B', '2024-04-17', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPRO'),
  ('16881030', 'Building 1', '12L', 'C', '2024-04-17', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('16881023', 'Building 1', '12L', 'B', '2024-04-17', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'smoke', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR MISSING IN THE ENTIRE APARTMENT LO'),
  ('16881022', 'Building 1', '12L', 'B', '2024-04-17', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). MISSING IN THE'),
  ('16881029', 'Building 1', '12L', 'C', '2024-04-17', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('16881039', 'Building 1', null, 'B', '2024-04-17', 'NOT COMPLIED WITH', 'lock-key', 'vent|lock|key|fob|door', '§ 27-2005 ADM CODE PROVIDE SECURITY IN THE EVENT OF A POWER OUTAGE BY MEANS OF AN ACCEPTAB'),
  ('16881038', 'Building 1', null, 'B', '2024-04-17', 'NOT COMPLIED WITH', 'common-area', 'door', '§ 27-2005, 2007 ADM CODE REMOVE THE ILLEGAL FASTENING CONSISTING OF AN UNACCEPTABLE ELECTR'),
  ('16014920', 'Building 1', null, 'C', '2023-06-05', 'NOT COMPLIED WITH', 'common-area', 'door', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('15622318', 'Building 1', '8B', 'C', '2022-12-20', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'lock-key', 'lock|key|fob|door', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOCK AND ASSEMBLY AT DOOR IN TH'),
  ('13761490', 'Building 1', '8B', 'A', '2020-08-12', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'door', '§ 27-2005 ADM CODE REFIT SLIDING DOORS IN WEST WALL CLOSET. IN THE 2nd ROOM FROM NORTH LOC'),
  ('13711465', 'Building 1', '8B', 'B', '2020-07-01', 'DEFECT LETTER ISSUED', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPRO'),
  ('13624171', 'Building 1', '8B', 'A', '2020-03-02', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'window', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOWER SASH OF WINDOW AT EAST WA'),
  ('13624180', 'Building 1', '8B', 'A', '2020-03-02', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'intercom', 'intercom|buzzer|bell', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE INTERCOM AT ENTRANCE LOCATED AT'),
  ('13624162', 'Building 1', '8B', 'A', '2020-03-02', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'window', '§ 27-2005 ADM CODE PROPERLY REPAIR THE BROKEN OR DEFECTIVE LOWER SASH OF WINDOW AT EAST WA'),
  ('19030084', 'Building 2', null, 'B', '2026-06-26', 'NOV SENT OUT', 'common-area', 'common area', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETA'),
  ('19030085', 'Building 2', null, 'A', '2026-06-26', 'NOV SENT OUT', 'common-area', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT A'),
  ('18789053', 'Building 2', null, 'B', '2026-04-16', 'NOV SENT OUT', 'leak', 'leak|water damage|drip', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT '),
  ('18789054', 'Building 2', null, 'B', '2026-04-16', 'NOV SENT OUT', 'common-area', 'common area', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETA'),
  ('18789055', 'Building 2', null, 'A', '2026-04-16', 'NOV SENT OUT', 'common-area', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT A'),
  ('18639717', 'Building 2', null, 'C', '2026-02-13', 'NOV SENT OUT', 'other', 'other', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE FIRE RETA'),
  ('18639718', 'Building 2', null, 'B', '2026-02-13', 'NOV SENT OUT', 'leak', 'leak|water damage|drip', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK CEI'),
  ('18639719', 'Building 2', null, 'A', '2026-02-13', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT C'),
  ('18620968', 'Building 2', null, 'C', '2026-02-06', 'NOV SENT OUT', 'other', 'door', '§ 27-2033 ADM CODE PROVIDE READY ACCESS TO BUILDINGS HEATING SYSTEM BOILER ROOM DOOR LOCKE'),
  ('18599635', 'Building 2', '1J', 'B', '2026-01-28', 'DEFECT LETTER ISSUED', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... GREAT'),
  ('18599637', 'Building 2', '1J', 'B', '2026-01-28', 'NOV SENT OUT', 'leak', 'leak|water damage|drip', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT '),
  ('18599636', 'Building 2', '1J', 'B', '2026-01-28', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('18599638', 'Building 2', '1J', 'B', '2026-01-28', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('18164126', 'Building 2', '6C', 'B', '2025-08-13', 'DEFECT LETTER ISSUED', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... LESS '),
  ('17821400', 'Building 2', '1D', 'B', '2025-04-14', 'NOV SENT OUT', 'other', 'door|faucet|sink|basin|shower|bathtub|tub|toilet|cabinet', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE DOOR AT SINK CABINET IN '),
  ('17821401', 'Building 2', '1D', 'C', '2025-04-14', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('17821399', 'Building 2', '1D', 'A', '2025-04-14', 'NOV SENT OUT', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC T'),
  ('17821398', 'Building 2', '1D', 'C', '2025-04-14', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('17037571', 'Building 2', '6C', 'B', '2024-06-12', 'NOV SENT OUT', 'other', 'smoke', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT '),
  ('17037568', 'Building 2', '6C', 'A', '2024-06-12', 'NOV SENT OUT', 'other', 'door', '§ 27-2005 HMC: REFIT AT ENTRANCE DOOR IN THE ENTRANCE LOCATED AT APT 6C, 6th STORY, 1st A'),
  ('17037569', 'Building 2', '6C', 'B', '2024-06-12', 'NOV SENT OUT', 'other', 'window', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE SPRING BALANCE AT LOWER '),
  ('17037570', 'Building 2', '6C', 'B', '2024-06-12', 'NOV SENT OUT', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN T'),
  ('17037572', 'Building 2', '6C', 'B', '2024-06-12', 'NOV SENT OUT', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC F'),
  ('17040597', 'Building 2', null, 'C', '2024-06-11', 'NOT COMPLIED WITH', 'electrical', 'door|electric|outlet|light|wiring', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('16605042', 'Building 2', '1B', 'C', '2024-01-19', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'no-hot-water', 'hot water', '§ 27-2031 ADM CODE PROVIDE HOT WATER AT ALL HOT WATER FIXTURES IN THE BATHROOM LOCATED AT '),
  ('16605039', 'Building 2', '6K', 'B', '2024-01-19', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'leak', 'leak|water damage|drip|faucet|sink|basin|shower|bathtub|tub|toilet', '§ 27-2026 ADM CODE REPAIR THE LEAKY AND/OR DEFECTIVE FAUCETS AT BATHTUB AT EAST WALL IN TH'),
  ('16605040', 'Building 2', '6K', 'B', '2024-01-19', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC F'),
  ('16605041', 'Building 2', '6K', 'B', '2024-01-19', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'floor', '§ 27-2005 ADM CODE REMOVE THE TORN AND/OR LOOSE FLOOR COVERING , IN THE 5th ROOM FROM NORT'),
  ('16544795', 'Building 2', '6K', 'B', '2023-12-21', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPRO'),
  ('16297599', 'Building 2', '6K', 'B', '2023-10-10', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPRO'),
  ('16179688', 'Building 2', '6K', 'A', '2023-08-23', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT T'),
  ('16179689', 'Building 2', '6K', 'A', '2023-08-23', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'other', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC W'),
  ('16179691', 'Building 2', '6K', 'A', '2023-08-23', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT T'),
  ('16024649', 'Building 2', '6K', 'A', '2023-06-09', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'leak', 'leak|water damage|drip', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT '),
  ('16024650', 'Building 2', '6K', 'B', '2023-06-09', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC T'),
  ('16024651', 'Building 2', '6K', 'A', '2023-06-09', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('16024652', 'Building 2', '6K', 'B', '2023-06-09', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('16024653', 'Building 2', '6K', 'A', '2023-06-09', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'leak', 'leak|water damage|drip', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT '),
  ('15964314', 'Building 2', '6K', 'B', '2023-05-08', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'leak', 'leak|water damage|drip', '§ 27-2026, 2027 HMC: PROPERLY REPAIR THE SOURCE AND ABATE THE EVIDENCE OF A WATER LEAK AT '),
  ('15964312', 'Building 2', '6K', 'B', '2023-05-08', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('15964311', 'Building 2', '6K', 'A', '2023-05-08', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2013 ADM CODE PAINT WITH LIGHT COLORED PAINT TO THE SATISFACTION OF THIS DEPARTMENT A'),
  ('15964310', 'Building 2', '6K', 'B', '2023-05-08', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'other', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC T'),
  ('15937363', 'Building 2', '6K', 'B', '2023-04-24', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'floor', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE CERAMIC F'),
  ('15937362', 'Building 2', '6K', 'A', '2023-04-24', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('14999537', 'Building 2', '5J', 'A', '2022-03-14', 'VIOLATION WILL BE REINSPECTED', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... AT CE'),
  ('18235003', 'Building 3', '3A', 'B', '2025-09-19', 'NOV SENT OUT', 'appliance', 'door|refrigerator|fridge', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE GASKET AT REFRIGERATOR L'),
  ('18235005', 'Building 3', null, 'C', '2025-09-19', 'NOV SENT OUT', 'electrical', 'door|electric|outlet|light|wiring', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('18235004', 'Building 3', '3A', 'B', '2025-09-19', 'NOV SENT OUT', 'leak', 'faucet|sink|basin|shower|bathtub|tub|toilet', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE WATER SUPPLY LINE SHUT O'),
  ('18235006', 'Building 3', null, 'B', '2025-09-19', 'NOV SENT OUT', 'electrical', 'door|electric|outlet|light|wiring', '§ 27-2005 HMC: REFIT FIRE DOOR LEADING TO ELECTRIC ROOM AND STORE ROOM AT PUBLIC HALL AT '),
  ('17171202', 'Building 3', '3J', 'B', '2024-08-08', 'NOV SENT OUT', 'other', 'plaster|paint|wall|ceiling|sheetrock|hole', '§ 27-2005 ADM CODE REPAIR THE BROKEN OR DEFECTIVE PLASTERED SURFACES AND PAINT IN A UNIFOR'),
  ('17038939', 'Building 3', '7K', 'C', '2024-06-11', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('17046551', 'Building 3', '2K', 'C', '2024-06-11', 'NOTICE OF ISSUANCE SENT TO TENANT', 'mold', 'mold|mildew', '§ 27-2017.3 HMC: TRACE AND REPAIR THE SOURCE AND ABATE THE VISIBLE MOLD CONDITION... APPRO'),
  ('17038982', 'Building 3', null, 'B', '2024-06-11', 'NOV SENT OUT', 'common-area', 'door|stair|tread', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH ASSEMBLY ON BULKHE'),
  ('17022389', 'Building 3', '5L', 'B', '2024-06-07', 'NOV SENT OUT', 'electrical', 'electric|outlet|light|wiring', '§ 27-2037, 2038 HMC: PROVIDE A SAFE AND ADEQUATE SUPPLY OF ELECTRIC SERVICE TO THE FIXTURE'),
  ('17022388', 'Building 3', '3B', 'B', '2024-06-05', 'NOV SENT OUT', 'other', 'door', '§ 27-2005 HMC: PROPERLY REPAIR OR REPLACE THE BROKEN OR DEFECTIVE LATCH AT DOOR IN THE ENT'),
  ('17022387', 'Building 3', '3B', 'C', '2024-06-05', 'NOV SENT OUT', 'other', 'door', '§ 27-2005, 27-2007, 27-2041.1 HMC, §238, § 309; § 107 (2) ( C) MDL AND 28 RCNY §25-171: RE'),
  ('17022391', 'Building 3', '5L', 'B', '2024-06-05', 'NOV SENT OUT', 'other', 'smoke', '§ 27-2045 ADM CODE REPAIR OR REPLACE THE SMOKE DETECTOR DEFECTIVE IN THE ENTIRE APARTMENT '),
  ('17022386', 'Building 3', '3B', 'C', '2024-06-05', 'NOTICE OF ISSUANCE SENT TO TENANT', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('17022392', 'Building 3', '5L', 'B', '2024-06-05', 'NOV SENT OUT', 'electrical', 'electric|outlet|light|wiring', '§ 27-2037, 2038 HMC: PROVIDE A SAFE AND ADEQUATE SUPPLY OF ELECTRIC SERVICE TO THE FIXTURE'),
  ('17022384', 'Building 3', '3B', 'B', '2024-06-05', 'NOV SENT OUT', 'other', 'cabinet', '§ 27-2005 ADM CODE PROPERLY REPAIR WITH SIMILAR MATERIAL THE BROKEN OR DEFECTIVE WOOD BASE'),
  ('17022385', 'Building 3', '3B', 'B', '2024-06-05', 'NOV SENT OUT', 'other', 'carbon|monoxide|co detector|alarm', '§ 27-2046.1 HMC: REPAIR OR REPLACE THE CARBON MONOXIDE DETECTING DEVICE(S). DEFECTIVE IN T'),
  ('17022390', 'Building 3', '5L', 'B', '2024-06-05', 'NOV SENT OUT', 'other', 'window', '§ 27-2005 HMC: REFIT WINDOW AT NORTH WALL IN THE 3rd ROOM FROM NORTH AT EAST LOCATED AT A'),
  ('16674710', 'Building 3', '11L', 'C', '2024-02-20', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('16080800', 'Building 3', '3J', 'C', '2023-07-07', 'NOT COMPLIED WITH', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('16080799', 'Building 3', '3J', 'C', '2023-07-07', 'DEFECT LETTER ISSUED', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('16034036', 'Building 3', '2K', 'C', '2023-06-13', 'NOT COMPLIED WITH', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('16034035', 'Building 3', '2K', 'C', '2023-06-13', 'DEFECT LETTER ISSUED', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('16001022', 'Building 3', '3A', 'C', '2023-05-26', 'DEFECT LETTER ISSUED', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('15922111', 'Building 3', '10C', 'C', '2023-04-14', 'NOT COMPLIED WITH', 'pest', 'mice|mouse|rodent|rat|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF MICE IN THE ENTIRE APARTMENT'),
  ('15281513', 'Building 3', '3A', 'C', '2022-07-29', 'DEFECT LETTER ISSUED', 'pest', 'roach|bug|pest|exterminat', 'HMC ADM CODE: § 27-2017.4 ABATE THE INFESTATION CONSISTING OF ROACHES IN THE ENTIRE APARTM'),
  ('15281515', 'Building 3', '9C', 'A', '2022-07-29', 'FIRST NO ACCESS TO RE- INSPECT VIOLATION', 'leak', 'faucet|sink|basin|shower|bathtub|tub|toilet', '§ 27-2005 ADM CODE PROPERLY SECURE THE LOOSE FAUCET AT WASH BASIN IN THE BATHROOM LOCATED ');

-- ---------------------------------------------------------------------------
-- 1) VIOLATION ↔ WORK ORDER MATCHES (the evidence table)
--    Same building; same apartment when the violation names one; and the WO
--    mentions the issue (keyword or same category). Completed WOs with a
--    signature or photos are the strongest evidence.
-- ---------------------------------------------------------------------------
select
  v.violationid, v.building, coalesce(v.apt, 'common') as apt, v.cls,
  v.issued, v.hpd_status, v.gist as violation,
  w.ticket_number, w.status as wo_status, w.title as wo_title,
  w.reported_at::date as reported, w.resolved_at::date as resolved,
  w.signed_by_name,
  jsonb_array_length(coalesce(w.photos, '[]'::jsonb)) as photo_count
from v_open v
join public.buildings b on b.name = v.building
left join public.units u
  on v.apt is not null and u.building_id = b.id and lower(u.label) = lower(v.apt)
join public.work_orders w
  on w.building_id = b.id
 and (v.apt is null or w.unit_id = u.id)
 and (   w.title ~* v.kw
      or coalesce(w.description, '') ~* v.kw
      or w.category = v.category)
order by v.building, v.apt nulls last, v.cls, v.violationid, w.reported_at;

-- ---------------------------------------------------------------------------
-- 2) VIOLATIONS WITH NO MATCHING WORK ORDER AT ALL (true gaps — real work needed)
-- ---------------------------------------------------------------------------
select v.violationid, v.building, coalesce(v.apt, 'common') as apt, v.cls,
       v.issued, v.hpd_status, v.category, v.gist
from v_open v
join public.buildings b on b.name = v.building
left join public.units u
  on v.apt is not null and u.building_id = b.id and lower(u.label) = lower(v.apt)
where not exists (
  select 1 from public.work_orders w
   where w.building_id = b.id
     and (v.apt is null or w.unit_id = u.id)
     and (w.title ~* v.kw or coalesce(w.description, '') ~* v.kw
          or w.category = v.category))
order by v.cls, v.building, v.apt nulls last;

-- ---------------------------------------------------------------------------
-- 3) ARCHIVED PAPERWORK per violation apartment (completed-WO PDFs and any
--    other filed documents for those units — printable proof for HPD)
-- ---------------------------------------------------------------------------
select distinct v.building, v.apt, d.name, d.category, d.path, d.created_at::date
from v_open v
join public.buildings b on b.name = v.building
join public.units u on u.building_id = b.id and lower(u.label) = lower(v.apt)
join public.documents d on d.building_id = b.id and d.unit_id = u.id
where v.apt is not null
order by v.building, v.apt, d.created_at::date;

-- ---------------------------------------------------------------------------
-- 4) One-line summary
-- ---------------------------------------------------------------------------
select
  (select count(distinct violationid) from v_open) as open_violations,
  (select count(distinct v.violationid)
     from v_open v
     join public.buildings b on b.name = v.building
     left join public.units u on v.apt is not null and u.building_id = b.id
                             and lower(u.label) = lower(v.apt)
     join public.work_orders w on w.building_id = b.id
      and (v.apt is null or w.unit_id = u.id)
      and (w.title ~* v.kw or coalesce(w.description,'') ~* v.kw
           or w.category = v.category)) as with_wo_evidence;
