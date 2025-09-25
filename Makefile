# Makefile for test-challenge-video-player
SHELL := bash

.PHONY: help env install lint start build preview clean

help:
	@echo "Available targets:"
	@echo "  env      - show Node/Yarn info and version manager"
	@echo "  install  - enable Corepack and install deps with Yarn 4"
	@echo "  lint     - type-check via TypeScript"
	@echo "  start    - run dev server (vite)"
	@echo "  build    - type-check and build"
	@echo "  preview  - preview production build"
	@echo "  clean    - remove build and install artifacts"

install:
	@corepack enable
	@yarn install

lint:
	@yarn tsc --noEmit

start:
	@yarn dev

build:
	@yarn tsc --noEmit
	@yarn build

preview:
	@yarn preview

clean:
	@rm -rf dist node_modules .yarn/cache .yarn/install-state.gz
