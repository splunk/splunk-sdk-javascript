# text reset
NO_COLOR=\033[0m
# green
OK_COLOR=\033[32;01m
# red
ERROR_COLOR=\033[31;01m
# cyan
WARN_COLOR=\033[36;01m
# yellow
ATTN_COLOR=\033[33;01m

ROOT_DIR := $(shell git rev-parse --show-toplevel)

VERSION := `git describe --tags --dirty 2>/dev/null`
COMMITHASH := `git rev-parse --short HEAD 2>/dev/null`
DATE := `date "+%FT%T%z"`

.PHONY: all
all: init test

init:
	@echo "$(ATTN_COLOR)==> init $(NO_COLOR)"

.PHONY: test
test:
	@echo "$(ATTN_COLOR)==> test $(NO_COLOR)"
	@node sdkdo tests ${arg}

.PHONY: test_specific
test_specific:
	@echo "$(ATTN_COLOR)==> test_specific $(NO_COLOR)"
	@sh ./scripts/test_specific.sh

.PHONY: up
up:
	@echo "$(ATTN_COLOR)==> up $(NO_COLOR)"
	@docker-compose up -d

.PHONY: wait_up
wait_up:
	@echo "$(ATTN_COLOR)==> wait_up $(NO_COLOR)"
	@for i in `seq 0 180`; do if docker exec -it splunk /sbin/checkstate.sh &> /dev/null; then break; fi; printf "\rWaiting for Splunk for %s seconds..." $$i; sleep 1; done

.PHONY: down
down:
	@echo "$(ATTN_COLOR)==> down $(NO_COLOR)"
	@docker-compose stop

.PHONY: deps
deps:
	@echo "$(ATTN_COLOR)==> Checking nodes.js dependencies $(NO_COLOR)"
	@echo "$(ATTN_COLOR)==> Installing nodes.js 14 $(NO_COLOR)"
	@source $(HOME)/.nvm/nvm.sh ; nvm install 14
	@echo "$(ATTN_COLOR)==> npm install $(NO_COLOR)"
	@npm install

.PHONY: clean
clean:
	@echo "$(ATTN_COLOR)==> Cleaning client/ directory $(NO_COLOR)"
	@rm -rf client/splunk.*.js >/dev/null 2>&1

.PHONY: build
build: clean deps
	@echo "$(OK_COLOR)==> Initiating the build... $(NO_COLOR)"
	@source $(HOME)/.nvm/nvm.sh; nvm run 14 sdkdo compile
