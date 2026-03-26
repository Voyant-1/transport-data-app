import { NextRequest, NextResponse } from "next/server";
import { validateDotNumber } from "@/lib/validators";
import { getCarrier, getAuthority } from "@/lib/fmcsa-api";

export interface SaferSnapshot {
  dotNumber: string;
  legalName: string;
  dbaName: string;
  entityType: string;
  usdotStatus: string;
  operatingAuthority: string;
  powerUnits: number;
  drivers: number;
  mcs150Date: string;
  mcs150Mileage: string;
  physicalAddress: string;
  phone: string;
  operationClassification: string[];
  carrierOperation: string[];
  cargoCarried: string[];
  safetyRating: string;
  safetyRatingDate: string;
  outOfServiceDate: string;
  mcNumbers: string[];
}

export async function GET(request: NextRequest) {
  try {
    const dotNumber = request.nextUrl.searchParams.get("dotNumber") || "";

    if (!validateDotNumber(dotNumber)) {
      return NextResponse.json({ error: "Invalid DOT number" }, { status: 400 });
    }

    // Fetch carrier data and authority in parallel from QCMobile API
    const [carrier, authorities] = await Promise.all([
      getCarrier(dotNumber),
      getAuthority(dotNumber),
    ]);

    if (!carrier) {
      return NextResponse.json(
        { error: "No record found for this DOT number", dotNumber },
        { status: 404 }
      );
    }

    // Build operating authority string
    let operatingAuthority = "Unknown";
    if (authorities.length > 0) {
      const auth = authorities[0];
      const types: string[] = [];
      if (auth.authorizedForProperty === "Y") types.push("Property");
      if (auth.authorizedForPassenger === "Y") types.push("Passenger");
      if (auth.authorizedForHouseholdGoods === "Y") types.push("HHG");
      if (auth.authorizedForBroker === "Y") types.push("Broker");
      if (auth.commonAuthorityStatus === "A" && types.length > 0) {
        operatingAuthority = `AUTHORIZED FOR ${types.join(", ")}`;
      } else if (carrier.allowedToOperate === "Y") {
        operatingAuthority = "Active (Private/Exempt)";
      } else {
        operatingAuthority = "NOT AUTHORIZED";
      }
    } else if (carrier.allowedToOperate === "Y") {
      operatingAuthority = "Active (Private/Exempt)";
    } else {
      operatingAuthority = "NOT AUTHORIZED";
    }

    // Build MC numbers from authority data
    const mcNumbers = authorities
      .filter((a) => a.docketNumber)
      .map((a) => `${a.prefix}-${a.docketNumber}`);

    const snapshot = {
      dotNumber,
      legalName: carrier.legalName || "",
      dbaName: carrier.dbaName || "",
      entityType: carrier.isPassengerCarrier === "Y" ? "PASSENGER CARRIER" : "CARRIER",
      usdotStatus: carrier.statusCode === "A" ? "ACTIVE" : carrier.statusCode === "I" ? "INACTIVE" : carrier.statusCode || "Unknown",
      operatingAuthority,
      powerUnits: carrier.totalPowerUnits || 0,
      drivers: carrier.totalDrivers || 0,
      mcs150Date: carrier.mcs150Outdated || "",
      mcs150Mileage: "",
      physicalAddress: `${carrier.phyStreet || ""}, ${carrier.phyCity || ""}, ${carrier.phyState || ""} ${carrier.phyZipcode || ""}`,
      phone: "",
      operationClassification: [],
      carrierOperation: carrier.carrierOperation ? [carrier.carrierOperation.carrierOperationDesc] : [],
      cargoCarried: [],
      safetyRating: carrier.safetyRating || "",
      safetyRatingDate: carrier.safetyRatingDate || "",
      outOfServiceDate: carrier.oosDate || "",
      mcNumbers,
      allowedToOperate: carrier.allowedToOperate === "Y",
      // Crash stats from QCMobile
      crashTotal: carrier.crashTotal || 0,
      fatalCrash: carrier.fatalCrash || 0,
      injCrash: carrier.injCrash || 0,
      towawayCrash: carrier.towawayCrash || 0,
      // Inspection stats from QCMobile (with national averages)
      vehicleInsp: carrier.vehicleInsp || 0,
      vehicleOosInsp: carrier.vehicleOosInsp || 0,
      vehicleOosRate: carrier.vehicleOosRate || 0,
      vehicleOosRateNationalAvg: carrier.vehicleOosRateNationalAverage || "",
      driverInsp: carrier.driverInsp || 0,
      driverOosInsp: carrier.driverOosInsp || 0,
      driverOosRate: carrier.driverOosRate || 0,
      driverOosRateNationalAvg: carrier.driverOosRateNationalAverage || "",
      hazmatInsp: carrier.hazmatInsp || 0,
      hazmatOosInsp: carrier.hazmatOosInsp || 0,
      hazmatOosRate: carrier.hazmatOosRate || 0,
      hazmatOosRateNationalAvg: carrier.hazmatOosRateNationalAverage || "",
    };

    return NextResponse.json(snapshot, { headers: { "X-Source": "QCMobile" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
