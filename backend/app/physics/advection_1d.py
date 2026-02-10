"""
1D advection: u_t + c u_x = 0.
Upwind (donor-cell) scheme. Returns u(x) at requested time steps for frontend viz.
"""
from __future__ import annotations

import numpy as np


def solve_1d_advection(
    *,
    nx: int = 100,
    c: float = 1.0,
    num_steps: int = 50,
    output_interval: int = 10,
) -> dict:
    """
    Solve u_t + c u_x = 0 on [0, 1] with periodic BC and Gaussian initial condition.
    c = advection speed (grid cells per time step when dt/dx chosen for CFL=1).
    Returns dict with x, and list of (step, u) for plotting.
    """
    dx = 1.0 / (nx - 1)
    # CFL = c * dt / dx = 1 => dt = dx / c
    dt = dx / abs(c) if c != 0 else dx
    x = np.linspace(0, 1, nx)

    # Gaussian initial condition
    u = np.exp(-40 * (x - 0.25) ** 2)

    results = [{"step": 0, "u": u.tolist()}]
    for n in range(1, num_steps + 1):
        u_new = u.copy()
        if c >= 0:
            u_new[1:] = u[1:] - c * dt / dx * (u[1:] - u[:-1])
            u_new[0] = u[0] - c * dt / dx * (u[0] - u[-1])  # periodic
        else:
            u_new[:-1] = u[:-1] - c * dt / dx * (u[1:] - u[:-1])
            u_new[-1] = u[-1] - c * dt / dx * (u[0] - u[-1])  # periodic
        u = u_new
        if n % output_interval == 0:
            results.append({"step": n, "u": u.tolist()})

    return {
        "x": x.tolist(),
        "c": c,
        "dt": dt,
        "dx": dx,
        "num_steps": num_steps,
        "series": results,
    }
