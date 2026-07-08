//go:build !linux

package encoding

import "syscall"

func setSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{}
}
