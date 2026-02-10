"""
2D advection-diffusion: u_t + c_x u_x + c_y u_y = D (u_xx + u_yy).
Simple finite-difference scheme. Returns 2D field at requested time steps.
"""
from __future__ import annotations

import numpy as np


def solve_2d_advection_diffusion(
    *,
    nx: int = 40,
    ny: int = 30,
    cx: float = 0.5,
    cy: float = 0.0,
    diffusion: float = 0.001,
    num_steps: int = 30,
    output_interval: int = 10,
) -> dict:
    """
    Solve on [0,1] x [0,1] with periodic BC. Gaussian blob initial condition.
    Returns dict with dimensions and list of (step, u_2d) as row-major lists.
    """
    dx = 1.0 / (nx - 1)
    dy = 1.0 / (ny - 1)
    # CFL: dt <= min(dx/|cx|, dy/|cy|); also stability for diffusion: dt <= min(dx^2, dy^2) / (4*D)
    dt_adv = min(dx / max(abs(cx), 1e-6), dy / max(abs(cy), 1e-6))
    dt_diff = 0.25 * min(dx**2, dy**2) / max(diffusion, 1e-10)
    dt = min(dt_adv, dt_diff, 0.002)

    x = np.linspace(0, 1, nx)
    y = np.linspace(0, 1, ny)
    X, Y = np.meshgrid(x, y)
    u = np.exp(-80 * ((X - 0.3) ** 2 + (Y - 0.5) ** 2))

    results = [{"step": 0, "u": u.flatten().tolist()}]
    for n in range(1, num_steps + 1):
        u_new = u.copy()
        # Advection (upwind)
        if cx >= 0:
            u_new[:, 1:] -= cx * dt / dx * (u[:, 1:] - u[:, :-1])
            u_new[:, 0] -= cx * dt / dx * (u[:, 0] - u[:, -1])
        else:
            u_new[:, :-1] -= cx * dt / dx * (u[:, 1:] - u[:, :-1])
            u_new[:, -1] -= cx * dt / dx * (u[:, 0] - u[:, -1])
        if cy >= 0:
            u_new[1:, :] -= cy * dt / dy * (u[1:, :] - u[:-1, :])
            u_new[0, :] -= cy * dt / dy * (u[0, :] - u[-1, :])
        else:
            u_new[:-1, :] -= cy * dt / dy * (u[1:, :] - u[:-1, :])
            u_new[-1, :] -= cy * dt / dy * (u[0, :] - u[-1, :])
        # Diffusion (Laplacian, 5-point stencil)
        u_new[1:-1, 1:-1] += diffusion * dt * (
            (u[2:, 1:-1] + u[:-2, 1:-1] + u[1:-1, 2:] + u[1:-1, :-2] - 4 * u[1:-1, 1:-1])
            / (dx * dy)
        )
        u = u_new
        if n % output_interval == 0:
            results.append({"step": n, "u": u.flatten().tolist()})

    return {
        "nx": nx,
        "ny": ny,
        "cx": cx,
        "cy": cy,
        "diffusion": diffusion,
        "num_steps": num_steps,
        "series": results,
    }
