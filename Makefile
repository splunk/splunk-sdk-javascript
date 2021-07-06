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
	@npm test

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
