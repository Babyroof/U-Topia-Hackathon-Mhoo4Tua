import { type DeedDetails, formatArea } from "~~/utils/rwa/deed";

/** All deed fields from the form, as a definition list. */
export const DeedInfo = ({ serial, details }: { serial: string; details?: DeedDetails }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm m-0">
    <dt className="opacity-60">Deed number</dt>
    <dd className="serial m-0 break-all">{serial}</dd>
    {details ? (
      <>
        <dt className="opacity-60">Parcel number</dt>
        <dd className="m-0">{details.landNo}</dd>
        <dt className="opacity-60">Survey page</dt>
        <dd className="m-0">{details.surveyPage}</dd>
        <dt className="opacity-60">Location</dt>
        <dd className="m-0">
          {details.tambon}, {details.amphoe}, {details.province}
        </dd>
        <dt className="opacity-60">Area</dt>
        <dd className="m-0">{formatArea(details)}</dd>
      </>
    ) : (
      <>
        <dt className="opacity-60">Details</dt>
        <dd className="m-0 opacity-60">No extra details</dd>
      </>
    )}
  </dl>
);
