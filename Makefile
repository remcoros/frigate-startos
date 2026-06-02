# overrides to s9pk.mk must precede the include statement
TARGETS := rocm

include s9pk.mk

.PHONY += rocm

rocm: ; VARIANT=rocm $(MAKE) arches ARCHES=x86
