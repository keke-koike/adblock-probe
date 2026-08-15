"use client";

import { createContext } from "react";

import type { AdBlockDetector } from "../core/types";

export const AdBlockDetectorContext = createContext<AdBlockDetector | null>(null);
