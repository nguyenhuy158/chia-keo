import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest chay voi globals: false nen RTL khong tu dang ky cleanup — khong don
// tay thi DOM cua test truoc con lai, va getByRole se thay hai phan tu.
afterEach(cleanup);
