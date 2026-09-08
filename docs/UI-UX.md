# XRSS UI/UX

## Purpose

XRSS UI is an administration and configuration interface, not a SaaS
marketing dashboard.

The RSS endpoint must remain clean RSS without UI.

## Design Principles

- Minimal
- Professional
- Functional
- Fast
- Readable
- Accessible
- Responsive
- Consistent
- Information-dense where appropriate

## Visual Direction

Use a restrained tooling/interface aesthetic.

Avoid:
- generic AI-dashboard layouts
- excessive cards
- gratuitous gradients
- glassmorphism
- excessive shadows
- decorative borders
- emoji as UI
- excessive animation
- fake metrics
- unnecessary illustrations
- visual elements without functional purpose

## Design System

Define and consistently use:
- typography
- spacing scale
- colors
- surfaces
- borders
- radii
- buttons
- inputs
- forms
- tables
- alerts
- status indicators
- loading/error/empty states

## Accessibility

Use:
- semantic HTML
- proper labels
- keyboard navigation
- visible focus states
- sufficient contrast
- reduced-motion support

## Responsive Design

Admin UI must work on:
- desktop
- tablet
- mobile

## Architecture

Keep UI presentation separate from business logic.

Do not duplicate backend validation rules in a way that creates conflicting
sources of truth.

## Required Review

Before considering UI work complete, verify:

1. Does it look like a generic AI-generated dashboard?
2. Is every component necessary?
3. Is hierarchy clear?
4. Are spacing and typography deliberate?
5. Are interaction states complete?
6. Is the interface accessible?
7. Does it remain usable on small screens?

Use the installed Hermes UI skills:
- Impeccable
- Hallmark
- Anti-UI-Slop